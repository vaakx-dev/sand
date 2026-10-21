import type { UsageTotals } from '@sand/usage/contract'
import { emptyTotals, sumUsage } from '@sand/usage/records'

export const addTotals = <T extends UsageTotals>(into: T, from: UsageTotals) => {
  into.usage = sumUsage(into.usage, from.usage)
  into.turns += from.turns
  into.cost += from.cost
  into.billed += from.billed
  into.unpriced += from.unpriced
  return into
}

export const addRecord = (into: Record<string, UsageTotals>, key: string, from: UsageTotals) => {
  into[key] = addTotals(into[key] ?? emptyTotals(), from)
}

export const including = (list: string[], items: string[]) => {
  for (const item of items) if (!list.includes(item)) list.push(item)
  return list
}
