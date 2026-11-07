import type { ModelPrice, Usage } from '@sand/accounts/contract'
import type { UsageTotals } from '../contract'

export const tokensOf = (usage: Usage) => usage.input + usage.output + usage.cacheRead + usage.cacheWrite

const cacheWriteCost = ({ cacheWrite, cacheWriteLong = 0 }: Usage, price: ModelPrice) =>
  (cacheWrite - cacheWriteLong) * price.cacheWrite + cacheWriteLong * (price.cacheWriteLong ?? price.cacheWrite)

export const costOf = (usage: Usage, price: ModelPrice) =>
  (usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead + cacheWriteCost(usage, price)) / 1_000_000

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const sumUsage = (a: Usage, b: Usage): Usage => {
  const cacheWriteLong = (a.cacheWriteLong ?? 0) + (b.cacheWriteLong ?? 0)
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    ...(cacheWriteLong && { cacheWriteLong }),
  }
}

export const emptyTotals = (): UsageTotals => ({ usage: emptyUsage(), turns: 0, cost: 0, billed: 0, unpriced: 0 })

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)
