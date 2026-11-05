import { ledger, unrecorded } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
  const sand = await startSand([{ id: 'fake', models: ['m'], replies }], home)
  running.push(sand)
  return sand
}

const expireLeases = () => {
  const db = new Database(join(home, 'sand.db'))
  db.run('update turns set lease = 0 where ended is null')
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

const killDuring = async (replies: Source['replies'], after: 'gate' | 'text') => {
  const child = Bun.spawn([Bun.argv[0]!, join(import.meta.dir, 'dying.ts'), home, JSON.stringify({ replies, after })], { stdout: 'pipe' })
  const line = await new Response(child.stdout).body!.getReader().read()
  const died = JSON.parse(new TextDecoder().decode(line.value)) as { chat: string; turn: string }
  child.kill()
  await child.exited
  return died
}

const restart = async ({ chat, turn }: { chat: string; turn: string }) => {
  expireLeases()
  const next = await start()
  return { next, chat: next.sessions.require(chat), turn }
}

const dieDuring = async (replies: Source['replies'], after: 'gate' | 'text') => restart(await killDuring(replies, after))

test('a turn whose process died is marked lost when sand starts again, keeping the results it recorded', async () => {
  const { next, chat: recovered, turn } = await dieDuring([[{ type: 'call', name: 'echo', input: { word: 'pong' } }, { type: 'call', name: 'gate' }]], 'gate')

  expect(recovered.messages().slice(2)).toEqual([
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('pong')] }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-2', content: [said(unrecorded)], isError: true }] },
  ])
  expect(recovered.latest('turn-ending')?.data).toEqual({ stopReason: 'lost' })
  expect(next.turns.get(turn)).toMatchObject({ status: 'lost', stopReason: 'lost' })
  expect(next.turns.current(recovered)).toBeUndefined()
  expect(next.app.get(ledger)!.db.query('select status from provider_threads').all()).toEqual([{ status: 'uncertain' }])
})

test('what the model had said when its process died is kept', async () => {
  const { chat: recovered } = await dieDuring([[said('Half a thought'), { type: 'hold' }]], 'text')

  expect(recovered.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Half a thought')] })
  expect(recovered.latest('turn-ending')?.data).toEqual({ stopReason: 'lost' })
})

test("a lost turn's untaken steers wait for the user if the user sent them, and run on their own otherwise", async () => {
  const died = await killDuring([[{ type: 'call', name: 'gate' }]], 'gate')
  const witness = await start()
  const chat = witness.sessions.require(died.chat)
  await witness.turns.send(chat, { prompt: 'and then this', clientRequestId: 'user' })
  await witness.turns.send(chat, { prompt: 'job done', origin: 'job', clientRequestId: 'job' })

  const { next, chat: recovered } = await restart(died)

  expect(next.turns.pending(recovered).map(({ kind, origin, held }) => ({ kind, origin, held }))).toEqual([
    { kind: 'queue', origin: 'user', held: true },
    { kind: 'queue', origin: 'job', held: false },
  ])
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
  await expect(second.turns.run(same, 'again')).rejects.toThrow('A turn is already running in this chat')

  expect(second.turns.interrupt(same)).toBe(true)
  expect(await turn).toMatchObject({ stopReason: 'interrupted' })
  expect(second.turns.current(same)).toBeUndefined()
}, 10_000)
