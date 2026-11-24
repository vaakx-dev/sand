import type { Session } from '@sand/chats/contract'
import { idleSharesSet } from '@sand/compaction/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const CACHE_MARGIN_MS = 30_000

const said = (text: string) => ({ type: 'text', text }) as const

const thirtyPercentFull = { type: 'context', window: 100_000, used: 24_000 } as const

const idleSource = (id: string, cacheTtlMs: number, streamMs = 0): Source => ({
  id,
  models: ['m'],
  replies: [[said('hello')], [said('noted')], [{ type: 'wait', ms: streamMs }, thirtyPercentFull, { type: 'usage', input: 24_000, output: 10, cacheTtlMs }, said('done')], [said('the summary')]],
})

const LONG_BRIEF = 'Background for the job. '.repeat(5_000)

const talk = async (session: Session) => {
  await sand.turns.run(session, 'hello')
  await sand.turns.run(session, LONG_BRIEF)
  await sand.turns.run(session, 'hi')
}

const summarized = (source: string) => sand.native(source).some(call => call.type === 'send' && call.text.includes('<conversation>'))

const onModel = (session: Session, model: string) => {
  sand.app.get(modelSettings)?.change(session, { model })
  return session
}

test('an idle bot compacts once its context passes the bot share of the limit, a thread waits for its larger share, and quick chats never do', async () => {
  sand = await startSand([idleSource('bot', CACHE_MARGIN_MS), idleSource('thread', CACHE_MARGIN_MS), idleSource('quick', CACHE_MARGIN_MS)])
  const bot = onModel(sand.sessions.bot('helper', sand.home), 'bot/m')
  const thread = sand.chat('thread/m')
  const quick = onModel(sand.sessions.quick(), 'quick/m')

  await Promise.all([talk(bot), talk(thread), talk(quick)])
  await Bun.sleep(300)

  expect([summarized('bot'), summarized('thread'), summarized('quick')]).toEqual([true, false, false])
})

test('lowering the thread share in settings makes an idle thread at that size compact', async () => {
  sand = await startSand([idleSource('thread', CACHE_MARGIN_MS)])
  await sand.ask(idleSharesSet, { bot: 0.25, thread: 0.1 })
  const thread = sand.chat('thread/m')

  await talk(thread)
  await Bun.sleep(300)

  expect(summarized('thread')).toBe(true)
})

test('the idle timer counts the cache lifetime from when the step was sent, not from when its reply finished', async () => {
  sand = await startSand([idleSource('bot', CACHE_MARGIN_MS + 1_000, 1_500)])
  const bot = onModel(sand.sessions.bot('helper', sand.home), 'bot/m')

  await talk(bot)
  await Bun.sleep(300)

  expect(summarized('bot')).toBe(true)
})
