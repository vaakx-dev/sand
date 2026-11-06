import type { Computer, Computers } from './contract'

export const createRegistry = (changed: () => void): Computers => {
  const entries = new Map<string, Computer>()

  return {
    register(computer) {
      const { id } = computer.info
      if (entries.has(id)) throw new Error(`A computer named "${id}" is already registered`)
      entries.set(id, computer)
      changed()
      return () => {
        if (entries.get(id) !== computer) return
        entries.delete(id)
        changed()
      }
    },
    list: () => [...entries.values()].map(({ info }) => info),
    get: id => entries.get(id),
  }
}
