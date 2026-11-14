import { type Branch, type Entry, isPrompt } from './contract'

const promptsByAnchor = (oldestFirst: Entry[]) => {
  const nearestMessage = new Map<string, string | null>()
  const anchorOf = (entry: Entry) => nearestMessage.get(entry.parent ?? '') ?? null
  const groups = new Map<string | null, string[]>()
  for (const entry of oldestFirst) {
    if (isPrompt(entry)) groups.set(anchorOf(entry), [...(groups.get(anchorOf(entry)) ?? []), entry.id])
    nearestMessage.set(entry.id, entry.type === 'message' ? entry.id : anchorOf(entry))
  }
  return [...groups.values()]
}

export const forksOf = (oldestFirst: Entry[]): Branch[][] => {
  const forks = promptsByAnchor(oldestFirst).filter(group => group.length > 1)
  if (!forks.length) return []
  const starts = new Set(forks.flat())
  const within = new Map<string, string[]>()
  const leaves = new Map<string, string>()
  for (const entry of oldestFirst) {
    const above = within.get(entry.parent ?? '') ?? []
    const mine = starts.has(entry.id) ? [...above, entry.id] : above
    within.set(entry.id, mine)
    for (const start of mine) leaves.set(start, entry.id)
  }
  return forks.map(group => group.map(entry => ({ entry, leaf: leaves.get(entry)! })))
}
