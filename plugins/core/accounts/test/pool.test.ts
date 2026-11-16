import { expect, test } from 'bun:test'
import { drainOrder, type Billing, type LimitWindow, type LLM, type ModelInfo, planSiblings, type SourceInfo } from '../src/contract'

const now = 1_000_000
const hour = 3_600_000

const source = (id: string, billing: Billing = 'plan'): SourceInfo => ({
  id,
  kind: id,
  label: id,
  provider: 'anthropic',
  billing,
  shown: 1,
  total: 1,
  fresh: 0,
  newModels: 'show',
  search: false,
  slugs: true,
})

const opus = (source: string): ModelInfo => ({ id: `${source}/opus`, name: 'opus', label: 'Opus', source, efforts: [] })

const window = (used: number, resetsAt?: number): LimitWindow => ({ id: 'session', label: 'Session', used, ...(resetsAt !== undefined && { resetsAt }) })

const poolOf = (sources: SourceInfo[], windows: Record<string, LimitWindow[]>): LLM => ({
  stream: () => (async function* () {})(),
  sources: () => sources,
  models: () => sources.map(found => opus(found.id)),
  sourceLimits: () => Object.entries(windows).map(([source, found]) => ({ source, windows: found, updated: now })),
})

const order = (llm: LLM) => drainOrder(llm, llm.models?.() ?? [], now).map(model => model.source)

test('drains the account whose usage resets soonest first, leaves tight ones for last and skips spent ones', () => {
  const llm = poolOf([source('late'), source('soon'), source('tight'), source('spent'), source('unknown')], {
    late: [window(0.2, now + 5 * hour)],
    soon: [window(0.6, now + hour)],
    tight: [window(0.95, now + hour / 2)],
    spent: [window(1, now + hour)],
  })

  expect(order(llm)).toEqual(['soon', 'late', 'unknown', 'tight'])
})

const day = 24 * hour

const session = (used: number, resetsAt: number): LimitWindow => ({ id: 'session', label: 'Session', used, resetsAt, duration: 5 * hour })

const week = (used: number, resetsAt: number): LimitWindow => ({ id: 'week', label: 'Week', used, resetsAt, duration: 7 * day })

test('spends first the weekly budget that would expire unused soonest, not the session that resets soonest', () => {
  const llm = poolOf([source('session-soon'), source('week-soon'), source('busy'), source('spent')], {
    'session-soon': [session(0.3, now + hour), week(0.2, now + 6 * day)],
    'week-soon': [session(0.3, now + 4 * hour), week(0.4, now + day)],
    busy: [session(0.95, now + 2 * hour), week(0.1, now + day / 2)],
    spent: [session(1, now + 3 * hour), week(0.1, now + day / 4)],
  })

  expect(order(llm)).toEqual(['week-soon', 'session-soon', 'busy'])
})

test('a window whose reset has passed counts as fresh', () => {
  const llm = poolOf([source('reset'), source('waiting')], { reset: [window(1, now - hour)], waiting: [window(0.5, now + hour)] })

  expect(order(llm)).toEqual(['waiting', 'reset'])
})

test('only plan accounts offering the same model are in the pool', () => {
  const llm = poolOf([source('plan'), source('key', 'api'), { ...source('away'), online: false }, source('spare')], {})

  expect(planSiblings(llm, opus('plan')).map(model => model.source)).toEqual(['plan', 'spare'])
})
