import type { UsageTotals } from '@sand/protocol'
import { dollars, tokens, tokensOf } from '@sand/kit'

export type Metric = 'cost' | 'tokens'

export const valueOf = (totals: UsageTotals, metric: Metric) => (metric === 'cost' ? totals.cost : tokensOf(totals.usage))

export const metricText = (value: number, metric: Metric) => (metric === 'cost' ? dollars(value) : tokens(value))

export const tickText = (value: number, metric: Metric) =>
  metric === 'cost' && Number.isInteger(value) ? `$${value}` : metricText(value, metric)
