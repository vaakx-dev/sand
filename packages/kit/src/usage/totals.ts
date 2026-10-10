import type { Usage } from '@sand/messages'
import type { UsageTotals } from '@sand/protocol'
import { tokensOf } from '../format/tokens'

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const sumUsage = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const emptyTotals = (): UsageTotals => ({ usage: emptyUsage(), turns: 0, cost: 0, billed: 0, unpriced: 0 })

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)
