import type { ModelPrice } from '@sand/accounts/contract'
import { addTotals, costOf, emptyTotals, type UsageSummary, type UsageTotals } from '@sand/usage/contract'

export type Prices = Map<string, ModelPrice>

const repriced = <T extends UsageTotals>(totals: T, price: ModelPrice | undefined): T =>
  price && totals.turns && totals.unpriced === totals.turns ? { ...totals, cost: totals.cost + costOf(totals.usage, price), unpriced: 0 } : totals

export const repricedSummary = (summary: UsageSummary, prices: Prices): UsageSummary => {
  const models = summary.models.map(model => repriced(model, prices.get(model.name)))
  return {
    ...summary,
    models,
    total: models.reduce((total, model) => addTotals(total, model), emptyTotals()),
    periods: summary.periods.map(period => ({
      ...period,
      models: Object.fromEntries(Object.entries(period.models).map(([name, totals]) => [name, repriced(totals, prices.get(name))])),
    })),
    unpriced: summary.unpriced.filter(item => !prices.has(item.model)),
  }
}
