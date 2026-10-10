import { usageQuery, type UsageRange } from '@sand/kit'
import type { Daemon } from '@sand/protocol'
import type { UsageSummary } from '@sand/usage/contract'
import { summaryText } from './print'

type Range = Exclude<UsageRange, 'month'>

const rangeTitles: Record<Range, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' }

const isRange = (value: string): value is Range => Object.hasOwn(rangeTitles, value)

export const usageReport = async (daemon: Daemon, [value = '30d']: string[]) => {
  if (!isRange(value)) throw new Error(`usage: sand usage [${Object.keys(rangeTitles).join(' | ')}]`)
  const summary = await daemon.request<UsageSummary>({ type: 'usage.summary', ...usageQuery(value) })
  console.log(summaryText(summary, rangeTitles[value]))
}
