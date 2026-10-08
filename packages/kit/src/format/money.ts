import type { ModelPrice, Usage, UsageTotals } from '@sand/protocol'

const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' })

export const dollars = (value: number) => (value > 0 && value < 0.01 ? '<$0.01' : usd.format(value))

export const usageCost = (totals: UsageTotals) => (totals.turns && totals.unpriced === totals.turns ? '—' : dollars(totals.cost))

export const costOf = (usage: Usage, price: ModelPrice) =>
  (usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead + usage.cacheWrite * price.cacheWrite) / 1_000_000
