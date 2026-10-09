import type { Thread, Threads } from '@sand/protocol'

export const visibleAncestor = (threads: Threads, thread: Thread | undefined) => {
  const seen = new Set<string>()
  let at = thread
  while (at?.info.kind === 'agent' && !seen.has(at.id)) {
    seen.add(at.id)
    at = at.info.parent ? threads.get(at.info.parent) : undefined
  }
  return at?.info.kind === 'agent' ? undefined : at
}
