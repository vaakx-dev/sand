import type { Tracked } from './contract'

export const createRegistry = () => {
  const tracked = new Set<Tracked>()
  return {
    track(entry: Tracked) {
      const held = { ...entry }
      tracked.add(held)
      return () => void tracked.delete(held)
    },
    byChat: () => Map.groupBy(tracked, entry => entry.conversation),
  }
}

export type Registry = ReturnType<typeof createRegistry>
