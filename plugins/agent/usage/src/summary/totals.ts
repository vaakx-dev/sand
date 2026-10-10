import type { Billing, ModelPrice } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { UsageTotals } from '../contract'
import { costOf, tokensOf } from '@sand/kit'

export const emptyTotals = (): UsageTotals => ({ usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, turns: 0, cost: 0, billed: 0, unpriced: 0 })

export const addUsage = <T extends UsageTotals>(totals: T, usage: Usage, price: ModelPrice | undefined, billed: boolean) => {
  totals.usage.input += usage.input
  totals.usage.output += usage.output
  totals.usage.cacheRead += usage.cacheRead
  totals.usage.cacheWrite += usage.cacheWrite
  totals.turns++
  if (!price) {
    totals.unpriced++
    return totals
  }
  const cost = costOf(usage, price)
  totals.cost += cost
  if (billed) totals.billed += cost
  return totals
}

export const isBilled = (billing: Billing) => billing === 'api' || billing === 'credits'

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)
