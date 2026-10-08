import type { UsageSummary } from '@sand/protocol'
import { ask } from '../../daemon/ask'
import { requireRunning } from '../../daemon/info'
import { printSummary } from './print'
import { queryFor, ranges, type Range } from './range'

const isRange = (value: string): value is Range => (ranges as readonly string[]).includes(value)

export const usageReport = async (home: string, [value = '30d']: string[]) => {
  if (!isRange(value)) throw new Error(`usage: sand usage [${ranges.join(' | ')}]`)
  const info = await requireRunning(home)
  const summary = await ask<UsageSummary>(info, { type: 'usage.summary', ...queryFor(value) })
  console.log(printSummary(summary, value))
}
