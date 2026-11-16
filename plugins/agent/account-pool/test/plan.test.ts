import type { LimitWindow } from '@sand/accounts/contract'
import { day, type History, hour, hourKey, type HourUsage, startOfHour } from '@sand/usage/contract'
import { expect, test } from 'bun:test'
import { type Candidate, planAccounts } from '../src/plan'

const now = startOfHour(Date.now()) + 30 * 60_000

const steadyHistory = (accounts: string[]): History => {
  const since = now - 3 * day
  const periods: HourUsage[] = []
  for (let at = startOfHour(since); at < now; at += hour) periods.push({ key: hourKey(at), accounts: Object.fromEntries(accounts.map(account => [account, { cost: 1, tokens: 0 }])) })
  return { since, periods }
}

const session = (used: number, resetsIn?: number): LimitWindow => ({ id: 'session', label: 'Session', used, duration: 5 * hour, ...(resetsIn !== undefined && { resetsAt: now + resetsIn }) })

const week = (used: number, resetsIn: number): LimitWindow => ({ id: 'week', label: 'Week', used, duration: 7 * day, resetsAt: now + resetsIn })

const account = (source: string, ...windows: LimitWindow[]): Candidate => ({ source, key: source, windows })

const order = (candidates: Candidate[], history?: History) => planAccounts(candidates, history, now).map(found => found.source)

test('an account whose 5-hour window is on track to lock is eased off even when its weekly budget is the furthest behind', () => {
  const behind = account('behind', session(0.7, 2 * hour), week(0.3, 2 * day))
  const roomy = account('roomy', session(0.2, 2 * hour), week(0.5, 2 * day))

  expect(order([behind, roomy], steadyHistory(['behind', 'roomy']))).toEqual(['roomy', 'behind'])
})

test('the weekly budget furthest behind pace goes first, even when another resets sooner', () => {
  const later = account('later', week(0.2, 3 * day))
  const sooner = account('sooner', week(0.7, day))

  expect(order([sooner, later], steadyHistory(['later', 'sooner']))).toEqual(['later', 'sooner'])
})

test('with weekly budgets alike, a 5-hour window that would reset half unused is spent before a fresh one', () => {
  const started = account('started', session(0.5, hour), week(0.4, 2 * day))
  const fresh = account('fresh', session(0), week(0.4, 2 * day))

  expect(order([fresh, started], steadyHistory(['started', 'fresh']))).toEqual(['started', 'fresh'])
})

test('without a usage history the budget that resets soonest goes first, a nearly spent one goes last and a spent one never', () => {
  const soon = account('soon', week(0.2, day))
  const late = account('late', week(0.2, 4 * day))
  const nearly = account('nearly', session(0.95, hour), week(0.1, day))
  const spent = account('spent', session(1, hour), week(0.1, day))

  expect(order([late, nearly, spent, soon])).toEqual(['soon', 'late', 'nearly'])
})
