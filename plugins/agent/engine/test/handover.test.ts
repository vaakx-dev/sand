import { startSand, type Sand } from '@sand/harness'
import { runtimeDrain, runtimeRelease } from '@sand/host-runtimes/contract'
import type { Source } from '@sand/replay/contract'
import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SendResult } from '../src/contract'

let home: string
let running: Sand[]

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'sand-handover-'))
  running = []
})

afterEach(async () => {
  for (const sand of running) await sand.stop()
  rmSync(home, { recursive: true, force: true })
})

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies']) => {
  const sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], { home })
  running.push(sand)
  return sand
}

const crashedBefore = (turn: string) => {
  const db = new Database(join(home, 'sand.db'))
  db.query('update turns set recoveries = 3 where id = ?').run(turn)
  db.close()
}

const lease = (turn: string) => {
  const db = new Database(join(home, 'sand.db'), { readonly: true })
  const row = db.query<{ lease: number; handed: number }, [string]>('select lease, handed from turns where id = ?').get(turn)!
  db.close()
  return row
}

const startedTurn = (sent: SendResult) => (sent.disposition === 'started' ? sent.turn : '')

test('a turn running when its runtime drains finishes its tool calls, then a fresh runtime carries it on as the same turn without counting it as a crash', async () => {
  const old = await start([[{ type: 'call', name: 'gate' }]])
  const opened = Promise.withResolvers<void>()
  const answered = Promise.withResolvers<string>()
  old.tool('gate', () => {
    opened.resolve()
    return answered.promise
  })
  const chat = old.chat('fake/m')
  const turn = startedTurn(await old.turns.send(chat, { prompt: 'go', clientRequestId: 'go' }))
  await opened.promise

  old.app.emit(runtimeDrain)
  answered.resolve('open')
  while (old.turns.current(chat)) await Bun.sleep(10)
  crashedBefore(turn)

  const fresh = await start([[said('Done.')]])
  fresh.app.emit(runtimeRelease, [chat.id])
  const ended = await fresh.turns.wait(turn, 'end')
  const carried = fresh.sessions.require(chat.id)

  expect(ended).toMatchObject({ status: 'completed', ordinal: 1, step: 2 })
  expect(fresh.turns.list(carried)).toHaveLength(1)
  expect(carried.messages()).toEqual([
    { role: 'user', content: [said('go')] },
    { role: 'assistant', content: [{ type: 'tool_call', id: 'fake-1', name: 'gate', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('open')] }] },
    { role: 'assistant', content: [said('Done.')] },
  ])
})

test('turns handed over while the old runtime still runs a parent waiting on its child carry on in the new runtime at once, child first, then the parent', async () => {
  const old = await start([[{ type: 'call', name: 'delegate' }], [{ type: 'call', name: 'gate' }]])
  const parent = old.chat('fake/m')
  const child = old.chat('fake/m')
  const opened = Promise.withResolvers<void>()
  const answered = Promise.withResolvers<string>()
  old.tool('gate', () => {
    opened.resolve()
    return answered.promise
  })
  old.tool('delegate', async () => {
    const turn = startedTurn(await old.turns.send(child, { prompt: 'help', clientRequestId: 'help' }))
    return (await old.turns.wait(turn, 'end')).status
  })
  const parentTurn = startedTurn(await old.turns.send(parent, { prompt: 'go', clientRequestId: 'go' }))
  await opened.promise
  const childTurn = old.turns.current(child)!.id

  old.app.emit(runtimeDrain)
  answered.resolve('open')
  while (!lease(childTurn).handed) await Bun.sleep(10)
  const heldUntil = lease(parentTurn).lease
  while (lease(parentTurn).lease === heldUntil) await Bun.sleep(50)

  const fresh = await start([[said('Helped.')], [said('Done.')]])
  fresh.app.emit(runtimeRelease, [child.id])
  expect(await fresh.turns.wait(childTurn, 'end')).toMatchObject({ status: 'completed' })
  while (!lease(parentTurn).handed) await Bun.sleep(10)
  fresh.app.emit(runtimeRelease, [parent.id])

  expect(await fresh.turns.wait(parentTurn, 'end')).toMatchObject({ status: 'completed' })
  expect(fresh.sessions.require(parent.id).messages().at(-1)).toEqual({ role: 'assistant', content: [said('Done.')] })
}, 30_000)
