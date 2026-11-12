import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { guessChange, guessRead } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (source: Source) => {
  sand = await startSand([source], { plugins: ['agent/guesses'] })
  return sand.chat(`${source.id}/m`)
}

const withoutCacheMarks = (messages: unknown) => JSON.parse(JSON.stringify(messages, (key, value) => (key === 'cache_control' ? undefined : value)))

test('guesses with the same request as the turn plus one question, and a new turn clears the guess', async () => {
  const chat = await start({ id: 'a', api: 'anthropic', models: ['m'], replies: [[said('Done.')], [said('"Now run the tests"')], [said('Ran them.')]] })
  const guessed = sand.heard(guessChange)
  await sand.turns.run(chat, 'fix the bug')
  expect(await guessed).toEqual([chat.id, { turn: expect.any(String), text: 'Now run the tests' }])

  const [turn, guess] = sand.requests('a').map(body => JSON.parse(body))
  expect(guess.system).toEqual(turn.system)
  expect(guess.tools).toEqual(turn.tools)
  expect(withoutCacheMarks(guess.messages).slice(0, turn.messages.length)).toEqual(withoutCacheMarks(turn.messages))
  expect(guess.messages).toHaveLength(turn.messages.length + 2)

  const cleared = sand.heard(guessChange)
  await sand.turns.run(chat, 'run the tests')
  expect(await cleared).toEqual([chat.id, null])
  expect(await sand.ask(guessRead, { session: chat.id })).toBeNull()
})

test("asks an app's own session beside the thread instead of sending into it", async () => {
  const chat = await start({ id: 'n', models: ['m'], replies: [[said('Done.')], [said('Ship it')]] })
  const guessed = sand.heard(guessChange)
  await sand.turns.run(chat, 'fix the bug')
  await guessed

  expect(await sand.ask(guessRead, { session: chat.id })).toMatchObject({ text: 'Ship it' })
  const calls = sand.native('n').map(call => call.type)
  expect(calls.filter(type => type === 'send')).toHaveLength(1)
  expect(calls).toContain('aside')
})
