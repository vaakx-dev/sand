import type { UsageTotals } from '@sand/usage/contract'

const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' })

export const dollars = (value: number) => (value > 0 && value < 0.01 ? '<$0.01' : usd.format(value))

export const usageCost = (totals: UsageTotals) => (totals.turns && totals.unpriced === totals.turns ? '—' : dollars(totals.cost))
