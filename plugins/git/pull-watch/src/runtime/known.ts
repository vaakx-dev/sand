import type { Change } from '@sand/watches/contract'

export const createKnown = () => {
  const byThread = new Map<string, Set<string>>()

  return {
    add(thread: string, key: string) {
      const keys = byThread.get(thread) ?? new Set<string>()
      byThread.set(thread, keys.add(key))
    },
    fresh: (thread: string, changes: Change[]) => changes.filter(change => !change.key || !byThread.get(thread)?.has(change.key)),
    forget: (thread: string) => void byThread.delete(thread),
  }
}

export type Known = ReturnType<typeof createKnown>
