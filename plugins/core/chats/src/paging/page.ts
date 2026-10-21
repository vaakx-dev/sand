import type { Database } from 'bun:sqlite'
import type { EntryPage, PageSize } from '../contract'
import { rowsById } from './rows'
import { pathWalker, type Step } from './walk'

export const defaultPage: Required<PageSize> = { entries: 60, bytes: 160_000 }

const reach = 30

const taken = (steps: Step[], { entries, bytes }: Required<PageSize>) => {
  let count = 0
  let size = 0
  while (count < steps.length && count < entries && (count === 0 || size + steps[count]!.size <= bytes)) size += steps[count++]!.size
  if (count >= steps.length || steps[count - 1]!.turn) return count
  for (let index = count; index < Math.min(steps.length, count + reach); index++) {
    size += steps[index]!.size
    if (size > 1.5 * bytes) return count
    if (steps[index]!.turn) return index + 1
  }
  return count
}

export const pager = (db: Database) => {
  const walk = pathWalker(db)
  const load = rowsById(db)
  return (session: string, start: string | null, size: PageSize = {}): EntryPage => {
    if (!start) return { entries: [], more: false }
    const limits = { ...defaultPage, ...size }
    const steps = walk(session, start, limits.entries + reach)
    const chosen = steps.slice(0, taken(steps, limits))
    const entries = load(chosen.map(step => step.id).reverse())
    return { entries, more: Boolean(chosen.at(-1)?.parent) }
  }
}
