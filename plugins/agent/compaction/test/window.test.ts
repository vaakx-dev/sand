import { contextGet } from '@sand/compaction/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

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
