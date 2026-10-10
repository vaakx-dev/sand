import type { Usage } from '@sand/messages'
import type { ModelPrice, UsageTotals } from '@sand/protocol'

export const tokensOf = (usage: Usage) => usage.input + usage.output + usage.cacheRead + usage.cacheWrite

export const costOf = (usage: Usage, price: ModelPrice) =>
  (usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead + usage.cacheWrite * price.cacheWrite) / 1_000_000

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const sumUsage = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const emptyTotals = (): UsageTotals => ({ usage: emptyUsage(), turns: 0, cost: 0, billed: 0, unpriced: 0 })

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)
