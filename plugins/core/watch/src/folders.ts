import { debouncedWatch } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import type { WatchedFolders } from './contract'

interface Entry<T> {
  value: Promise<T>
  stop: () => void
}

export const watchedFolders = <T>(
  report: (error: unknown) => void,
  load: (dir: string) => Promise<T>,
  empty: T,
  changed?: (dir: string) => void,
): WatchedFolders<T> => {
  const entries = new Map<string, Entry<T>>()
  const missed = new Set<string>()

  const safeLoad = (dir: string) =>
    load(dir).catch(error => {
      report(error)
      return empty
    })

  const reload = (dir: string) => {
    const entry = entries.get(dir)
    if (!entry) return
    if (existsSync(dir)) entry.value = safeLoad(dir)
    else {
      entry.stop()
      entries.delete(dir)
      missed.add(dir)
    }
    changed?.(dir)
  }

  return {
    get(dir) {
      const cached = entries.get(dir)
      if (cached) return cached.value
      if (!existsSync(dir)) {
        missed.add(dir)
        return Promise.resolve(empty)
      }
      const value = safeLoad(dir)
      entries.set(dir, { value, stop: debouncedWatch(dir, { recursive: true }, () => reload(dir)) })
      if (missed.delete(dir)) void value.then(() => changed?.(dir))
      return value
    },
    close() {
      for (const entry of entries.values()) entry.stop()
      entries.clear()
      missed.clear()
    },
  }
}
