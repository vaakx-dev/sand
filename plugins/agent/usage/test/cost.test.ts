import { expect, test } from 'bun:test'
import { costOf } from '../src/records'

const opus = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, cacheWriteLong: 8 }

test('cache writes cost the rate of the lifetime they were written for', () => {
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000, cacheWriteLong: 250_000 }
  expect(costOf(usage, opus)).toBeCloseTo(0.75 * 5 + 0.25 * 8)
})
