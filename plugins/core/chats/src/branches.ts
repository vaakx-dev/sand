import { type Branch, type Entry, hasToolResult, type Message } from './contract'

const isPrompt = (entry: Entry) => entry.type === 'message' && (entry.data as Message).role === 'user' && !hasToolResult(entry.data as Message)

const byAge = (a: Entry, b: Entry) => a.seq - b.seq

const anchorOf = (entries: Map<string, Entry>, entry: Entry) => {
  let parent = entries.get(entry.parent ?? '')
  while (parent && parent.type !== 'message') parent = entries.get(parent.parent ?? '')
  return parent?.id ?? null
}

const leafOf = (children: Map<string | null, Entry[]>, root: Entry) => {
  let leaf = root
  const stack = [root]
  for (let entry = stack.pop(); entry; entry = stack.pop()) {
    if (byAge(entry, leaf) > 0) leaf = entry
    stack.push(...(children.get(entry.id) ?? []))
  }
  return leaf.id
}

export const branchesOf = (entries: Map<string, Entry>, id: string): Branch[] => {
  const entry = entries.get(id)
  if (!entry) return []
  const anchor = anchorOf(entries, entry)
  const children = Map.groupBy(entries.values(), child => child.parent)
  return [...entries.values()]
    .filter(sibling => isPrompt(sibling) && anchorOf(entries, sibling) === anchor)
    .sort(byAge)
    .map(sibling => ({ entry: sibling.id, leaf: leafOf(children, sibling) }))
}
