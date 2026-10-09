import type { Daemon } from '@sand/protocol'
import type { UsageSummary } from '@sand/usage/contract'
import { printSummary } from './print'
import { queryFor, ranges, type Range } from './range'

const isRange = (value: string): value is Range => (ranges as readonly string[]).includes(value)

export const usageReport = async (daemon: Daemon, [value = '30d']: string[]) => {
  if (!isRange(value)) throw new Error(`usage: sand usage [${ranges.join(' | ')}]`)
  const summary = await daemon.request<UsageSummary>({ type: 'usage.summary', ...queryFor(value) })
  console.log(printSummary(summary, value))
}
