import type { ModelPrice } from '@sand/accounts/contract'
import type { ModelUsage, UsageSummary, UsageTotals } from '@sand/usage/contract'
import { expect, test } from 'bun:test'
import { repricedSummary } from '../src/data/reprice'

const rate: ModelPrice = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }

const totals = (turns: number, cost: number, unpriced: number): UsageTotals => ({
  usage: { input: 1_000_000 * turns, output: 100_000 * turns, cacheRead: 0, cacheWrite: 0 },
  turns,
  cost,
  billed: 0,
  unpriced,
})

const row = (name: string, found: UsageTotals): ModelUsage => ({ ...found, model: `claude/${name}`, name, label: name, provider: 'claude', account: 'claude|pc' })

const summary = (): UsageSummary => ({
  since: 0,
  until: 1,
  bucket: 'day',
  zone: 'UTC',
  total: totals(3, 1, 2),
  accounts: [],
  models: [row('sonnet', totals(2, 0, 2)), row('haiku', totals(1, 1, 0))],
  periods: [{ key: '2026-01-01', accounts: {}, models: { sonnet: totals(2, 0, 2), haiku: totals(1, 1, 0) } }],
  projects: [],
  unpriced: [{ model: 'sonnet', turns: 2, tokens: 2_200_000 }],
})

test('a model a PC left unpriced is priced from the price table, and the note about it goes away', () => {
  const found = repricedSummary(summary(), new Map([['sonnet', rate]]))

  const owed = 2 * (3 + 1.5)
  expect(found.models.map(model => model.cost)).toEqual([owed, 1])
  expect(found.models.map(model => model.unpriced)).toEqual([0, 0])
  expect(found.periods[0]!.models.sonnet!.cost).toBe(owed)
  expect(found.total).toMatchObject({ turns: 3, cost: owed + 1, unpriced: 0 })
  expect(found.unpriced).toEqual([])
})

test('a model with no price in the table stays unpriced and keeps its note', () => {
  const found = repricedSummary(summary(), new Map())

  expect(found.models[0]).toMatchObject({ cost: 0, unpriced: 2 })
  expect(found.total).toMatchObject({ cost: 1, unpriced: 2 })
  expect(found.unpriced).toHaveLength(1)
})

test('a model a PC already priced keeps its own cost whatever the table says', () => {
  const found = repricedSummary(summary(), new Map([['haiku', { ...rate, input: 100 }]]))

  expect(found.models[1]).toMatchObject({ cost: 1, unpriced: 0 })
})
