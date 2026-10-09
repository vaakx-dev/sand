import type { ProviderUsage, UsageSummary } from '@sand/usage/contract'
import { valueOf, type Metric } from '../../../format'
import { periodKeys } from '../../../range'

export interface Series {
  provider: ProviderUsage
  order: number
  values: number[]
  total: number
}

export const seriesOf = (summary: UsageSummary, metric: Metric) => {
  const keys = periodKeys(summary.since, summary.until, summary.bucket)
  const byKey = new Map(summary.periods.map(period => [period.key, period]))
  const series: Series[] = summary.providers.flatMap((provider, order) => {
    if (!provider.turns) return []
    const values = keys.map(key => valueOf(byKey.get(key)?.providers[provider.id], metric))
    return [{ provider, order, values, total: values.reduce((sum, value) => sum + value, 0) }]
  })
  return { keys, series }
}
