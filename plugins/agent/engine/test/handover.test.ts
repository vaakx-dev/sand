import { startSand, type Sand } from '@sand/harness'
import { runtimeDrain, runtimeRelease } from '@sand/host-runtimes/contract'
import type { Source } from '@sand/replay/contract'
import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
  const sand = await startSand([{ id: 'fake', models: ['m'], replies }], { home })
  running.push(sand)
  return sand
}

const crashedBefore = (turn: string) => {
  const db = new Database(join(home, 'sand.db'))
  db.query('update turns set recoveries = 3 where id = ?').run(turn)
  db.close()
}

test('a turn running when its runtime drains finishes its tool calls, then a fresh runtime carries it on as the same turn without counting it as a crash', async () => {
  const old = await start([[{ type: 'call', name: 'gate' }]])
  const opened = Promise.withResolvers<void>()
  const answered = Promise.withResolvers<string>()
  old.tool('gate', () => {
    opened.resolve()
    return answered.promise
  })
  const chat = old.chat('fake/m')
  const sent = await old.turns.send(chat, { prompt: 'go', clientRequestId: 'go' })
  const turn = sent.disposition === 'started' ? sent.turn : ''
  await opened

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
