import type { LimitWindow } from '@sand/accounts/contract'
import { day, type History, hour, hourKey, poolForecast, startOfHour } from '@sand/usage/contract'
import { expect, test } from 'bun:test'

const now = startOfHour(Date.now()) + 30 * 60_000

const steadyUse = (account: string): History => {
  const since = startOfHour(now) - 3 * day
  const periods = Array.from({ length: 72 }, (_, index) => ({ key: hourKey(since + index * hour), accounts: { [account]: { cost: 1, tokens: 0 } } }))
  return { since, periods }
}

const week = (used: number, resetsIn: number): LimitWindow => ({ id: 'week', label: 'Week', used, duration: 7 * day, resetsAt: now + resetsIn })

test('a pool spends the budget that resets first, and what is left in each account when it resets counts as unused', () => {
  const forecast = poolForecast(
    [
      { account: 'a', window: week(0.5, 2 * day) },
      { account: 'b', window: week(0, 6 * day) },
    ],
    steadyUse('a'),
    now,
  )

  expect(forecast?.start).toBe(now - 5 * day)
  expect(forecast?.reset).toBe(now + 6 * day)
  expect(forecast?.ahead[0]?.left).toBeCloseTo(0.75)
  expect(forecast?.leftAtReset).toBeCloseTo(0.25)
  expect(forecast?.outAt).toBeUndefined()
})

test('a pool runs out only once every account is spent, and is back when the first one resets', () => {
  const forecast = poolForecast(
    [
      { account: 'a', window: week(0.9, 2 * day) },
      { account: 'b', window: week(0.9, 4 * day) },
    ],
    steadyUse('a'),
    now,
  )

  expect(forecast?.outAt).toBeCloseTo(now + 16 * hour, -4)
  expect(forecast?.backAt).toBe(now + 2 * day)
})
