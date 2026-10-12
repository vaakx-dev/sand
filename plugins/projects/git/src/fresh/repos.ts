import type { Watcher } from '@sand/watch/contract'
import type { Dispose } from 'drydock'

const idleMs = 10 * 60_000
const settleMs = 750
const refTops = new Set(['HEAD', 'refs', 'packed-refs'])

const movesRefs = (filename: string | null) => {
  const [top = '', , file] = filename?.split(/[\\/]/) ?? []
  return top === 'worktrees' ? file === undefined || file === 'HEAD' : refTops.has(top)
}

export const watchedRepos = (watcher: Watcher, changed: () => void) => {
  const watches = new Map<string, { stop: Dispose; idle: Timer }>()

  const drop = (repo: string) => {
    const watch = watches.get(repo)
    clearTimeout(watch?.idle)
    void watch?.stop()
    watches.delete(repo)
  }

  return {
    touch(repo: string) {
      const found = watches.get(repo)
      clearTimeout(found?.idle)
      const stop = found?.stop ?? watcher.debounced(repo, { recursive: true, only: movesRefs }, changed, settleMs)
      watches.set(repo, { stop, idle: setTimeout(() => drop(repo), idleMs) })
    },
    close: () => [...watches.keys()].forEach(drop),
  }
}

export type WatchedRepos = ReturnType<typeof watchedRepos>
