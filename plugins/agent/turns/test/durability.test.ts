import { unrecorded } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

let home: string
let running: Sand[]

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'sand-turns-'))
  running = []
})

afterEach(async () => {
  for (const sand of running) await sand.stop()
  rmSync(home, { recursive: true, force: true })
})

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies'] = []) => {
  const sand = await startSand([{ id: 'fake', models: ['m'], replies }], { home })
  running.push(sand)
  return sand
}

const stop = async (sand: Sand) => {
  running.splice(running.indexOf(sand), 1)
  await sand.stop()
}

const expireLeases = (set = '') => {
  const db = new Database(join(home, 'sand.db'))
  db.run(`update turns set lease = 0${set} where ended is null`)
  db.close()
}

const blockingGate = (sand: Sand) => {
  const opened = Promise.withResolvers<void>()
  sand.tool('gate', () => {
    opened.resolve()
    return new Promise(() => {})
  })
  return opened.promise
}

interface Died {
  chat: string
  turn: string
}

const killDuring = async (replies: Source['replies'], after: 'gate' | 'look' | 'text'): Promise<Died> => {
  const child = Bun.spawn([Bun.argv[0]!, join(import.meta.dir, 'dying.ts'), home, JSON.stringify({ replies, after })], { stdout: 'pipe' })
  const line = await new Response(child.stdout).body!.getReader().read()
  const died = JSON.parse(new TextDecoder().decode(line.value)) as Died
  child.kill()
  await child.exited
  return died
}

const restart = async ({ chat, turn }: Died, replies: Source['replies']) => {
  const next = await start(replies)
  next.tool('echo', ({ word }) => String(word))
  next.app.get(tools)!.register({ name: 'look', description: 'look', input: z.object({}), effect: 'read', run: () => 'seen' })
  expireLeases()
  return { next, chat: next.sessions.require(chat), ended: await next.turns.wait(turn, 'end') }
}

test('a turn whose process died mid tool call carries on: kept results stay, and a call that may have acted is reported with its last output', async () => {
  const died = await killDuring([[{ type: 'call', name: 'echo', input: { word: 'pong' } }, { type: 'call', name: 'gate' }]], 'gate')
  const { chat, ended } = await restart(died, [[said('Carried on.')]])

  expect(ended).toMatchObject({ status: 'completed' })
  expect(chat.messages().slice(2)).toEqual([
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('pong')] }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-2', content: [said(`${unrecorded}\n\nIts last output:\nhalfway`)], isError: true }] },
    { role: 'assistant', content: [said('Carried on.')] },
  ])
})

test('a call that only reads runs again after its process died', async () => {
  const died = await killDuring([[{ type: 'call', name: 'look', input: {} }]], 'look')
  const { chat, ended } = await restart(died, [[said('Done.')]])

  expect(ended).toMatchObject({ status: 'completed' })
  expect(chat.messages().slice(2)).toEqual([
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('seen')] }] },
    { role: 'assistant', content: [said('Done.')] },
  ])
})

test('a model reply cut off when its process died is asked for again', async () => {
  const died = await killDuring([[said('Half a thought'), { type: 'hold' }]], 'text')
  const { chat, ended } = await restart(died, [[said('Whole thought.')]])

  expect(ended).toMatchObject({ status: 'completed' })
  expect(chat.messages()).toEqual([
    { role: 'user', content: [said('go')] },
    { role: 'assistant', content: [said('Whole thought.')] },
  ])
})

test('what was sent while a turn was down is steered into it or stays queued for after it', async () => {
  const died = await killDuring([[{ type: 'call', name: 'gate' }]], 'gate')
  const witness = await start()
  const down = witness.sessions.require(died.chat)
  await witness.turns.send(down, { prompt: 'and then this', clientRequestId: 'steer' })
  await witness.turns.send(down, { prompt: 'later', mode: 'queue', clientRequestId: 'queue' })
  await stop(witness)

  const { next, chat } = await restart(died, [[said('Steered.')], [said('Queued.')]])
  while (!next.turns.list(chat)[0]?.ended || next.turns.list(chat).length < 2) await Bun.sleep(20)

  expect(next.turns.list(chat).map(({ ordinal, status }) => ({ ordinal, status }))).toEqual([
    { ordinal: 2, status: 'completed' },
    { ordinal: 1, status: 'completed' },
  ])
  expect(chat.messages().slice(3)).toEqual([
    { role: 'user', content: [said('and then this')] },
    { role: 'assistant', content: [said('Steered.')] },
    { role: 'user', content: [said('later')] },
    { role: 'assistant', content: [said('Queued.')] },
  ])
})

test('a turn that keeps dying is lost, keeping what the model had said', async () => {
  const { chat, turn } = await killDuring([[said('Half a thought'), { type: 'hold' }]], 'text')
  expireLeases(', recoveries = 3')
  const next = await start()
  const recovered = next.sessions.require(chat)

  expect(next.turns.get(turn)).toMatchObject({ status: 'lost', stopReason: 'lost' })
  expect(recovered.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Half a thought')] })
  expect(recovered.latest('turn-ending')?.data).toEqual({ stopReason: 'lost' })
})

test('a turn running in another process is left alone, blocks a second runner and stops when interrupted from there', async () => {
  const first = await start([[{ type: 'call', name: 'gate' }]])
  const opened = blockingGate(first)
  const chat = first.chat('fake/m')
  const turn = first.turns.run(chat, 'go')
  await opened

  const second = await start()
  const same = second.sessions.require(chat.id)
  expect(second.turns.current(same)).toMatchObject({ status: 'running' })
  await expect(second.turns.run(same, 'again')).rejects.toThrow('A turn is already running in this conversation')

  expect(second.turns.interrupt(same)).toBe(true)
  expect(await turn).toMatchObject({ stopReason: 'interrupted' })
  expect(second.turns.current(same)).toBeUndefined()
}, 10_000)
