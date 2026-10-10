import type { UsageTotals } from '@sand/usage/contract'
import { tokensOf } from '@sand/kit'

export const emptyTotals = (): UsageTotals => ({ usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, turns: 0, cost: 0, billed: 0, unpriced: 0 })

export const addTotals = <T extends UsageTotals>(into: T, from: UsageTotals) => {
  into.usage = {
    input: into.usage.input + from.usage.input,
    output: into.usage.output + from.usage.output,
    cacheRead: into.usage.cacheRead + from.usage.cacheRead,
    cacheWrite: into.usage.cacheWrite + from.usage.cacheWrite,
  }
  into.turns += from.turns
  into.cost += from.cost
  into.billed += from.billed
  into.unpriced += from.unpriced
  return into
}

export const addRecord = (into: Record<string, UsageTotals>, key: string, from: UsageTotals) => {
  into[key] = addTotals(into[key] ?? emptyTotals(), from)
}

export const byCost = (a: UsageTotals, b: UsageTotals) => b.cost - a.cost || tokensOf(b.usage) - tokensOf(a.usage)

export const grouped = <T>(map: Map<string, T>, key: string, make: () => T) => {
  const found = map.get(key)
  if (found) return found
  const made = make()
  map.set(key, made)
  return made
}

export const including = (list: string[], items: string[]) => {
  for (const item of items) if (!list.includes(item)) list.push(item)
  return list
}
