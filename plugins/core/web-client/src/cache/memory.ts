import type { Thread } from '../contract'
import type { Store } from '../threads/store'

const keep = 10
const settle = 10_000

const family = (store: Store) => {
  const current = store.current ? store.threads.get(store.current) : undefined
  const ids = new Set<string>()
  if (current) ids.add(current.id)
  if (current?.info.parent) ids.add(current.info.parent)
  return (thread: Thread) => ids.has(thread.id) || ids.has(thread.info.parent ?? '')
}

const release = (store: Store, thread: Thread) => {
  thread.entries = new Map()
  thread.carried = undefined
  thread.complete = undefined
  thread.floor = undefined
  thread.cursor = undefined
  thread.loaded = false
  store.changed(thread.id, true)
}

export const trimMemory = (store: Store, opened: (id: string) => number | undefined) => {
  const holding = [...store.threads.values()].filter(thread => thread.entries.size)
  if (holding.length <= keep) return
  const now = Date.now()
  const near = family(store)
  const spare = holding
    .filter(thread => !thread.running && !near(thread) && now - (opened(thread.id) ?? 0) > settle)
    .sort((a, b) => (opened(a.id) ?? 0) - (opened(b.id) ?? 0))
  for (const thread of spare.slice(0, holding.length - keep)) release(store, thread)
}
