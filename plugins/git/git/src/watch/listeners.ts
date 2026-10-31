import type { GitLocal } from '../contract'

export type LocalListener = (local: GitLocal) => void

export const createLocalListeners = (report: (error: unknown) => void) => {
  const byCwd = new Map<string, Set<LocalListener>>()

  return {
    send(cwd: string, local: GitLocal) {
      for (const deliver of byCwd.get(cwd) ?? []) deliver(local)
    },
    add(cwd: string, listener: LocalListener): LocalListener {
      let last: string | undefined
      const deliver = (local: GitLocal) => {
        const print = JSON.stringify(local)
        if (print === last) return
        last = print
        try {
          listener(local)
        } catch (error) {
          report(error)
        }
      }
      const set = byCwd.get(cwd) ?? new Set()
      set.add(deliver)
      byCwd.set(cwd, set)
      return deliver
    },
    remove(cwd: string, deliver: LocalListener) {
      const set = byCwd.get(cwd)
      set?.delete(deliver)
      if (set?.size) return false
      byCwd.delete(cwd)
      return true
    },
    has: (cwd: string, deliver: LocalListener) => byCwd.get(cwd)?.has(deliver) ?? false,
    holding: (cwd: string) => Boolean(byCwd.get(cwd)?.size),
    clear: () => byCwd.clear(),
  }
}
