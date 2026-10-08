import type { ModelPrice, Usage, UsageTotals } from '@sand/protocol'
import { costOf, tokensOf } from '@sand/kit'

export const emptyTotals = (): UsageTotals => ({ usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, turns: 0, cost: 0, unpriced: 0 })

export const addUsage = <T extends UsageTotals>(totals: T, usage: Usage, price: ModelPrice | undefined) => {
  totals.usage.input += usage.input
  totals.usage.output += usage.output
  totals.usage.cacheRead += usage.cacheRead
  totals.usage.cacheWrite += usage.cacheWrite
  totals.turns++
  if (price) totals.cost += costOf(usage, price)
  else totals.unpriced++
  return totals
}

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)
