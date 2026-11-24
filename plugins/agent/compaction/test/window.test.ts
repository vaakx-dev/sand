import { contextGet } from '@sand/compaction/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

const STEP_MS = 600

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const summarized = (source: string) => sand.native(source).filter(call => call.type === 'send' && call.text.includes('<conversation>')).length

test('the window the provider reports outranks the catalog, so a chat well inside it is not compacted', async () => {
  sand = await startSand([
    {
      id: 'wide',
      models: [{ name: 'm', context: 100_000 }],
      replies: [[{ type: 'context', window: 1_000_000, used: 95_000 }, said('one')], [said('two')]],
    },
  ])
  const chat = sand.chat('wide/m')

  await sand.turns.run(chat, 'first')
  const second = await sand.turns.run(chat, 'second')

  expect(second).toMatchObject({ text: 'two' })
  expect(summarized('wide')).toBe(0)
  expect(await sand.ask(contextGet, { session: chat.id, owner: 'thread' })).toMatchObject({ window: 1_000_000, limit: 900_000 })
})

test('a long first turn starts compacting at the threshold as soon as its first step reports the window, before the turn ends', async () => {
  const longAnswer = said('Reading the logs. '.repeat(6_000))
  const slowDone: Reply = [{ type: 'wait', ms: STEP_MS }, said('Done.')]
  sand = await startSand([
    {
      id: 'long',
      models: ['m'],
      replies: [[{ type: 'context', window: 100_000, used: 70_000 }, longAnswer, { type: 'call', name: 'echo', input: { word: 'pong' } }], slowDone, slowDone],
    },
  ])
  const chat = sand.chat('long/m')
  const started = Date.now()

  const reply = sand.turns.run(chat, 'first')
  while (!summarized('long')) await Bun.sleep(10)
  const compactingAfterMs = Date.now() - started

  expect(compactingAfterMs).toBeLessThan(STEP_MS)
  expect(await reply).toMatchObject({ text: 'Done.' })
  expect(await sand.ask(contextGet, { session: chat.id, owner: 'thread' })).toMatchObject({ window: 100_000, limit: 80_000 })
})

test('with no window known, a huge chat is left alone until the provider says it is too long, then it compacts, retries and learns the window', async () => {
  sand = await startSand([
    {
      id: 'blind',
      models: ['m'],
      replies: [
        [{ type: 'usage', input: 5_000_000, output: 10 }, said('one')],
        [{ type: 'error', message: 'prompt is too long: 5000100 tokens > 200000 maximum' }],
        [said('the summary')],
        [said('two')],
      ],
    },
  ])
  const chat = sand.chat('blind/m')

  await sand.turns.run(chat, 'first')
  const before = summarized('blind')
  const second = await sand.turns.run(chat, 'second')

  expect(before).toBe(0)
  expect(second).toMatchObject({ text: 'two' })
  expect(summarized('blind')).toBe(1)
  expect(await sand.ask(contextGet, { session: chat.id, owner: 'thread' })).toMatchObject({ window: 200_000, limit: 180_000 })
})
