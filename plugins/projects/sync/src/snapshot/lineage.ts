import { readSnapshot, type Snapshot } from '../store/snapshots'
import type { Store } from '../store/store'

interface Visited {
  id: string
  snapshot: Snapshot
}

async function* newestFirst(store: Store, starts: string[], known = new Set<string>()): AsyncGenerator<Visited> {
  const seen = new Set(known)
  const queue: Visited[] = []
  const enqueue = async (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      const snapshot = await readSnapshot(store, id).catch(() => undefined)
      if (snapshot) queue.push({ id, snapshot })
    }
    queue.sort((a, b) => b.snapshot.time - a.snapshot.time)
  }
  await enqueue(starts)
  for (let next = queue.shift(); next; next = queue.shift()) {
    yield next
    await enqueue(next.snapshot.parents)
  }
}

export const lineage = async (store: Store, head: string, limit = 100, known?: Set<string>) => {
  const found: string[] = []
  for await (const { id } of newestFirst(store, [head], known)) {
    found.push(id)
    if (found.length >= limit) break
  }
  return found
}

export const isAncestor = async (store: Store, ancestor: string, descendant: string) => {
  for await (const { id } of newestFirst(store, [descendant])) if (id === ancestor) return true
  return false
}

export const mergeBase = async (store: Store, ours: string, theirs: string) => {
  const reachable = new Set<string>()
  for await (const { id } of newestFirst(store, [ours])) reachable.add(id)
  for await (const { id } of newestFirst(store, [theirs])) if (reachable.has(id)) return id
  return undefined
}
