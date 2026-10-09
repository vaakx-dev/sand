import type { ProviderUsage, UsageTotals } from '@sand/protocol'
import { dollars, percent, tokens, tokensOf, usageCost } from '@sand/kit'

export type Metric = 'cost' | 'tokens'

export const valueOf = (totals: UsageTotals | undefined, metric: Metric) => (!totals ? 0 : metric === 'cost' ? totals.cost : tokensOf(totals.usage))

export const metricText = (value: number, metric: Metric) => (metric === 'cost' ? dollars(value) : tokens(value))

export const tickText = (value: number, metric: Metric) =>
  metric === 'cost' && Number.isInteger(value) ? `$${value}` : metricText(value, metric)

const onPlan = (totals: UsageTotals) => totals.cost - totals.billed > 0.005

export const costText = (totals: UsageTotals) => `${onPlan(totals) ? '≈' : ''}${usageCost(totals)}`

export const valueText = (totals: UsageTotals, metric: Metric) => (metric === 'cost' ? costText(totals) : tokens(tokensOf(totals.usage)))

export const shareText = (value: number, total: number) => (value > 0 && value < total / 100 ? '<1%' : percent(total ? value / total : 0))

export const billingText = (provider: ProviderUsage) => {
  if (provider.billing === 'local') return 'Runs locally'
  const planned = provider.cost - provider.billed
  const parts = [
    provider.billed > 0 && `${dollars(provider.billed)} ${provider.billing === 'credits' ? 'in credits' : 'billed'}`,
    planned > 0.005 && `≈${dollars(planned)} on plan`,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : provider.billing === 'plan' ? 'On plan' : 'Billed per token'
}
