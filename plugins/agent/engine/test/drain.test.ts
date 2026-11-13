import { startSand, type Sand } from '@sand/harness'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'sand-drain-'))
let sand: Sand | undefined

afterEach(async () => {
  await sand?.stop()
  rmSync(home, { recursive: true, force: true })
})

const start = () => startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'text', text: 'Hi' }]] }], { home })

test('a message sent while sand reloads waits and runs once in the runtime that takes over', async () => {
  sand = await start()
  const chat = sand.chat('fake/m')
  sand.app.emit(runtimeDrain)
  const input = { prompt: 'hello', clientRequestId: 'hello-1' }

  const sent = await sand.turns.send(chat, input)
  expect(sent.disposition).toBe('queued')
  expect(sand.turns.current(chat)).toBeUndefined()
  expect(sand.requests('fake')).toEqual([])
  await sand.stop()

  sand = await start()
  const reopened = sand.sessions.open(chat.id)!
  const resent = await sand.turns.send(reopened, input)
  expect(resent).toEqual(sent)
  for (let tries = 0; tries < 300 && !sand.turns.list(reopened).some(turn => turn.ended); tries++) await Bun.sleep(10)
  expect(sand.turns.list(reopened).map(turn => turn.status)).toEqual(['completed'])
  expect(sand.requests('fake')).toHaveLength(1)
})
