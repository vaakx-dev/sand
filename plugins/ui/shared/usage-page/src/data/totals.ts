import { addTotals, emptyTotals, type UsageTotals } from '@sand/usage/contract'

export const addRecord = (into: Record<string, UsageTotals>, key: string, from: UsageTotals) => {
  into[key] = addTotals(into[key] ?? emptyTotals(), from)
}

export const including = (list: string[], items: string[]) => {
  for (const item of items) if (!list.includes(item)) list.push(item)
  return list
}
