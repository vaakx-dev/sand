import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

const said = (text: string) => ({ type: 'text', text }) as const
const drop = { type: 'drop' } as const
const tooMany = (headers: Record<string, string>) => ({ type: 'status', status: 429, error: 'rate_limit_error', headers }) as const

let sand: Sand

afterEach(() => sand.stop())

const fake = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }])
  return sand.chat('fake/m')
}

test('a connection that drops mid-reply is tried again after a pause, and the turn finishes', async () => {
  const chat = await fake([[said('Half'), drop], [said('Done.')]])

  expect(await sand.turns.run(chat, 'go')).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  expect(sand.requests('fake')).toHaveLength(2)
})

test('a short rate limit is waited out for as long as the provider asks, and the turn finishes', async () => {
  const chat = await fake([[tooMany({ 'retry-after-ms': '50' })], [said('Done.')]])
  const started = performance.now()

  expect(await sand.turns.run(chat, 'go')).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  expect(performance.now() - started).toBeLessThan(900)
  expect(sand.requests('fake')).toHaveLength(2)
})

test('a used-up subscription that resets later fails the turn without trying again', async () => {
  const chat = await fake([[tooMany({ 'anthropic-ratelimit-unified-status': 'rejected', 'retry-after': '3600' })], [said('Too soon.')]])

  await expect(sand.turns.run(chat, 'go')).rejects.toThrow('429 rate_limit_error')
  expect(sand.requests('fake')).toHaveLength(1)
})
