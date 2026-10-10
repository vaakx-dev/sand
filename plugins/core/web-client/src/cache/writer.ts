import type { Thread } from '../contract'
import { transact } from '../integrations/indexed-db'
import type { Store } from '../threads/store'
import { summaryKey, tailKey, type CachedThread, type Meta } from './records'
import { blankWritten, copyWritten, isStale, writeBatch, type Written } from './written'

const maxFailures = 2

export const createWriter = (store: Store) => {
  let scope: string | undefined
  let written = blankWritten()
  let touched = false
  let wipe = false
  let failures = 0
  const dirty = new Set<string>()
  const removed = new Set<string>()
  const opened = new Map<string, number>()

  const working = () => failures < maxFailures

  const restart = () => {
    written = blankWritten()
    wipe = true
    for (const id of store.threads.keys()) dirty.add(id)
  }

  const staleIds = () =>
    [...dirty].filter(id => {
      const thread = store.threads.get(id)
      return thread !== undefined && isStale(written, thread)
    })

  const merged = (next: Written) => {
    for (const [id, kept] of written.kept)
      if (!next.kept.has(id) && next.bytes.has(id) && store.threads.get(id)?.entries === kept.map) next.kept.set(id, kept)
    return next
  }

  const metaOf = (next: Written): Meta => ({
    synced: Object.fromEntries(store.synced),
    opened: Object.fromEntries([...opened].filter(([id]) => store.threads.has(id))),
    bytes: Object.fromEntries(next.bytes),
  })

  const flush = async () => {
    const key = scope
    if (!key || !working() || (!dirty.size && !removed.size && !touched)) return false
    const ids = staleIds()
    const gone = [...removed]
    dirty.clear()
    removed.clear()
    if (!ids.length && !gone.length && !touched && !wipe) return true
    touched = false
    const next = copyWritten(written)
    const wiping = wipe
    wipe = false
    try {
      await transact('readwrite', pick => {
        const batch = writeBatch(pick, key, next)
        if (wiping) batch.wipe()
        for (const id of ids) {
          const thread = store.threads.get(id)
          if (thread) batch.write(thread)
        }
        for (const id of gone) batch.remove(id)
        batch.evict(opened, store.current)
        pick('meta').put(metaOf(next), key)
        return () => undefined
      })
      if (scope === key) written = merged(next)
      failures = 0
      return true
    } catch {
      failures++
      restart()
      return false
    }
  }

  return {
    flush,
    scope: () => scope,
    busy: () => working() && (dirty.size > 0 || removed.size > 0 || touched),
    usable: () => Boolean(scope) && working(),
    has: (id: string) => written.bytes.has(id),
    opened: (id: string) => opened.get(id),
    changed(id: string) {
      if (scope) dirty.add(id)
    },
    removed(id: string) {
      dirty.delete(id)
      opened.delete(id)
      if (scope) removed.add(id)
    },
    touch(id: string) {
      opened.set(id, Date.now())
      touched = true
    },
    use(next: string | undefined) {
      if (next === scope) return
      scope = next
      removed.clear()
      dirty.clear()
      if (next) restart()
    },
    adopt(next: string, meta: Meta) {
      scope = next
      written = blankWritten()
      for (const [id, bytes] of Object.entries(meta.bytes)) written.bytes.set(id, bytes)
      for (const [id, at] of Object.entries(meta.opened)) opened.set(id, at)
      for (const thread of store.threads.values()) written.summaries.set(thread.id, summaryKey(thread))
      dirty.clear()
    },
    hydrated(thread: Thread, cached: CachedThread) {
      const ids = new Set(cached.entries.map(entry => entry.id))
      const bytes = written.bytes.get(thread.id) ?? 0
      written.kept.set(thread.id, { map: thread.entries, ids, bytes, tail: tailKey(cached.tail) })
    },
  }
}

export type Writer = ReturnType<typeof createWriter>
