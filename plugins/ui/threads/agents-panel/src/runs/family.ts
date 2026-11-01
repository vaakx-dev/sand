import type { Threads } from '@sand/web-client/contract'

export const descendants = (threads: Threads, id: string) => {
  const found = threads.children(id)
  for (const thread of found) found.push(...threads.children(thread.id).filter(child => !found.includes(child)))
  return found
}

export const isWithin = (threads: Threads, id: string, root: string) => {
  const seen = new Set<string>()
  for (let at = threads.get(id); at && !seen.has(at.id); at = at.info.parent ? threads.get(at.info.parent) : undefined) {
    if (at.id === root) return true
    seen.add(at.id)
  }
  return false
}
