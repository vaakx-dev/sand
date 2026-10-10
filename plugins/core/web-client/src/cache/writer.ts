import type { Entry } from '@sand/messages'
import type { Thread } from '../contract'
import type { Store } from '../threads/store'
import { transact, under, type StoreName } from './db'
import { entrySize, summaryKey, summaryOf, tailKey, tailOf, type CachedThread, type Meta } from './records'

const budget = { threads: 40, bytes: 30_000_000 }

interface Kept {
  map: Map<string, Entry>
  ids: Set<string>
  bytes: number
  tail: string
}

interface Written {
  summaries: Map<string, string>
  kept: Map<string, Kept>
  bytes: Map<string, number>
}

type Pick = (store: StoreName) => IDBObjectStore

const copy = (state: Written): Written => ({
  summaries: new Map(state.summaries),
  kept: new Map(state.kept),
  bytes: new Map(state.bytes),
})

const blank = (): Written => ({ summaries: new Map(), kept: new Map(), bytes: new Map() })

export const createWriter = (store: Store) => {
  let scope: string | undefined
  let written = blank()
  let pending = false
  let failures = 0
  const dirty = new Set<string>()
  const removed = new Set<string>()
  const opened = new Map<string, number>()
  let clean = false

  const restart = () => {
    written = blank()
    clean = true
    for (const id of store.threads.keys()) dirty.add(id)
  }

  const stale = (thread: Thread) => {
    if (written.summaries.get(thread.id) !== summaryKey(thread)) return true
    if (!thread.entries.size) return false
    const old = written.kept.get(thread.id)
    return !old || old.map !== thread.entries || old.ids.size !== thread.entries.size || old.tail !== tailKey(tailOf(thread))
  }

  const writeEntries = (pick: Pick, key: string, thread: Thread, next: Written) => {
    const old = next.kept.get(thread.id)
    const tail = tailOf(thread)
    const tailed = tailKey(tail)
    const fresh = !old || old.map !== thread.entries
    if (!fresh && old.ids.size === thread.entries.size && old.tail === tailed) return
    if (fresh) pick('entries').delete(under(key, thread.id))
    const ids = fresh ? new Set<string>() : new Set(old.ids)
    let bytes = fresh ? 0 : old.bytes
    for (const entry of thread.entries.values()) {
      if (ids.has(entry.id)) continue
      pick('entries').put(entry, [key, thread.id, entry.id])
      ids.add(entry.id)
      bytes += entrySize(entry)
    }
    if (fresh || old.tail !== tailed) pick('tails').put(tail, [key, thread.id])
    next.kept.set(thread.id, { map: thread.entries, ids, bytes, tail: tailed })
    next.bytes.set(thread.id, bytes)
  }

  const writeThread = (pick: Pick, key: string, thread: Thread, next: Written) => {
    const summary = summaryKey(thread)
    if (next.summaries.get(thread.id) !== summary) {
      pick('threads').put(summaryOf(thread), [key, thread.id])
      next.summaries.set(thread.id, summary)
    }
    if (thread.entries.size) writeEntries(pick, key, thread, next)
  }

  const dropEntries = (pick: Pick, key: string, id: string, next: Written) => {
    pick('tails').delete([key, id])
    pick('entries').delete(under(key, id))
    next.kept.delete(id)
    next.bytes.delete(id)
  }

  const evict = (pick: Pick, key: string, next: Written) => {
    const recent = [...next.bytes.keys()].sort((a, b) => (opened.get(b) ?? 0) - (opened.get(a) ?? 0))
    let total = 0
    let count = 0
    for (const id of recent) {
      total += next.bytes.get(id) ?? 0
      count++
      if (id !== store.current && (count > budget.threads || total > budget.bytes)) dropEntries(pick, key, id, next)
    }
  }

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
    if (!key || failures > 1 || (!dirty.size && !removed.size && !pending)) return false
    const ids = [...dirty].filter(id => {
      const thread = store.threads.get(id)
      return thread && stale(thread)
    })
    const gone = [...removed]
    dirty.clear()
    removed.clear()
    if (!ids.length && !gone.length && !pending && !clean) return true
    pending = false
    const next = copy(written)
    const wipe = clean
    clean = false
    try {
      await transact('readwrite', pick => {
        if (wipe) for (const name of ['threads', 'tails', 'entries'] as const) pick(name).delete(under(key))
        for (const id of ids) {
          const thread = store.threads.get(id)
          if (thread) writeThread(pick, key, thread, next)
        }
        for (const id of gone) {
          pick('threads').delete([key, id])
          next.summaries.delete(id)
          dropEntries(pick, key, id, next)
        }
        evict(pick, key, next)
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
    busy: () => failures < 2 && (dirty.size > 0 || removed.size > 0 || pending),
    usable: () => Boolean(scope) && failures < 2,
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
      pending = true
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
      written = blank()
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
