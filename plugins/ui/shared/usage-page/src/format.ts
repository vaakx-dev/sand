import type { UsageTotals } from '@sand/usage/contract'
import { ago, dollars, tokens, tokensOf } from '@sand/kit'

export type Metric = 'cost' | 'tokens'

export const valueOf = (totals: UsageTotals | undefined, metric: Metric) => (!totals ? 0 : metric === 'cost' ? totals.cost : tokensOf(totals.usage))

export const metricText = (value: number, metric: Metric) => (metric === 'cost' ? dollars(value) : tokens(value))

export const tickText = (value: number, metric: Metric) =>
  metric === 'cost' && Number.isInteger(value) ? `$${value}` : metricText(value, metric)

export const onPlanOf = (totals: UsageTotals) => Math.max(0, totals.cost - totals.billed)

const some = (value: number) => value > 0.005

export const billedText = (totals: UsageTotals) => (some(totals.billed) ? dollars(totals.billed) : '–')

export const planText = (totals: UsageTotals) => (some(onPlanOf(totals)) ? `≈${dollars(onPlanOf(totals))}` : '–')

export const agoText = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'just now' : `${since} ago`
}
