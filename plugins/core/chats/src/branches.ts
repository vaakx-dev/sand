import { type Branch, type Entry, isPrompt } from './contract'

export const branchesOf = (oldestFirst: Entry[], id: string): Branch[] => {
  const target = oldestFirst.find(entry => entry.id === id)
  if (!target) return []
  const nearestMessage = new Map<string, string | null>()
  const anchorOf = (entry: Entry) => nearestMessage.get(entry.parent ?? '') ?? null
  for (const entry of oldestFirst) nearestMessage.set(entry.id, entry.type === 'message' ? entry.id : anchorOf(entry))
  const anchor = anchorOf(target)
  const branchOf = new Map<string, string>()
  const leaves = new Map<string, string>()
  for (const entry of oldestFirst) {
    const branch = isPrompt(entry) && anchorOf(entry) === anchor ? entry.id : branchOf.get(entry.parent ?? '')
    if (!branch) continue
    branchOf.set(entry.id, branch)
    leaves.set(branch, entry.id)
  }
  return [...leaves].map(([entry, leaf]) => ({ entry, leaf }))
}
