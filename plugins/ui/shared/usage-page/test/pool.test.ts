import type { Limits, LimitWindow } from '@sand/accounts/contract'
import { type AccountUsage, day, type History, hour, hourKey, startOfHour } from '@sand/usage/contract'
import { expect, test } from 'bun:test'
import { gaugesOf } from '../src/data/gauges'
import { plansOf } from '../src/data/pool'

const now = startOfHour(Date.now()) + 30 * 60_000
const home = 'home-pc'

const window = (id: string, label: string, used: number, duration: number, resetsIn: number): LimitWindow => ({ id, label, used, duration, resetsAt: now + resetsIn })

const fromUsageEndpoint = (weeklyUsed: number, weeklyResetsIn: number) => [
  window('session', '5-hour', 0.3, 5 * hour, 2 * hour),
  window('weekly_all', 'Weekly', weeklyUsed, 7 * day, weeklyResetsIn),
]

const fromHeaders = (weeklyUsed: number, weeklyResetsIn: number) => [
  window('5h', '5-hour', 0.3, 5 * hour, 2 * hour),
  window('7d', 'Weekly', weeklyUsed, 7 * day, weeklyResetsIn),
]

const limits = (source: string, windows: LimitWindow[], updated: number): Limits => ({ source, windows, updated })

const account = (source: string, saved: Limits): AccountUsage => ({
  key: `${source}|${home}`,
  source,
  label: source,
  provider: 'anthropic',
  billing: 'plan',
  kind: 'claude',
  pc: home,
  pcName: 'Home',
  limits: saved,
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  turns: 0,
  cost: 0,
  billed: 0,
  unpriced: 0,
})

const steadyUse = (accounts: string[]): History => {
  const since = startOfHour(now) - 3 * day
  const periods = Array.from({ length: 72 }, (_, index) => ({ key: hourKey(since + index * hour), accounts: Object.fromEntries(accounts.map(key => [key, { cost: 1, tokens: 0 }])) }))
  return { since, periods }
}

const rows = (accounts: AccountUsage[], live: Limits[]) =>
  gaugesOf(plansOf({ accounts, live, sources: [], home }), steadyUse(accounts.map(found => found.key)), now).map(gauge => ({
    label: gauge.window.label,
    members: gauge.window.members.length,
    forecast: !!gauge.forecast,
  }))

test('two accounts pool each limit into one row with a forecast, whichever source reported their windows and in whatever order', () => {
  const spent = account('first', limits('first', fromUsageEndpoint(1, 2 * day), now - 60_000))
  const roomy = account('second', limits('second', fromUsageEndpoint(0.49, 5 * day), now - 60_000))
  const liveFromHeaders = [limits('first', fromHeaders(1, 2 * day), now), limits('second', fromHeaders(0.49, 5 * day), now)]
  const pooled = [
    { label: '5-hour', members: 2, forecast: true },
    { label: 'Weekly', members: 2, forecast: true },
  ]

  expect(rows([spent, roomy], [])).toEqual(pooled)
  expect(rows([roomy, spent], liveFromHeaders.slice(0, 1))).toEqual(pooled)
  expect(rows([spent, roomy], liveFromHeaders.slice(1))).toEqual(pooled)
  expect(rows([roomy, spent], liveFromHeaders)).toEqual(pooled)
})
