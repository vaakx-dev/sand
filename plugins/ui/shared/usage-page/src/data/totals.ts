import { addTotals, emptyTotals, type Spend, type UsageTotals } from '@sand/usage/contract'

export const addRecord = (into: Record<string, UsageTotals>, key: string, from: UsageTotals) => {
  into[key] = addTotals(into[key] ?? emptyTotals(), from)
}

export const addSpend = (into: Spend | undefined, from: Spend): Spend => ({ cost: (into?.cost ?? 0) + from.cost, tokens: (into?.tokens ?? 0) + from.tokens })
