import type { UsageTotals } from '@sand/usage/contract'
import { tokensOf } from '@sand/usage/records'
import { ago, dollars, tokens } from '@sand/util'

export type Metric = 'cost' | 'tokens'

export const metricValue = (totals: UsageTotals | undefined, metric: Metric) => {
  if (!totals) return 0
  return metric === 'cost' ? totals.cost : tokensOf(totals.usage)
}

export const metricText = (value: number, metric: Metric) => (metric === 'cost' ? dollars(value) : tokens(value))

export const tickText = (value: number, metric: Metric) =>
  metric === 'cost' && Number.isInteger(value) ? `$${value}` : metricText(value, metric)

export const onPlanOf = (totals: UsageTotals) => Math.max(0, totals.cost - totals.billed)

const some = (value: number) => value > 0.005

export const costText = (totals: UsageTotals) => {
  if (some(onPlanOf(totals))) return `≈${dollars(totals.cost)}`
  return some(totals.billed) ? dollars(totals.billed) : '–'
}

export const agoText = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'just now' : `${since} ago`
}
