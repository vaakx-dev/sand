import type { Entry } from '@sand/chats/contract'
import type { Thread } from '../contract'
import { under, type PickStore } from '../integrations/indexed-db'
import { entrySize, summaryKey, summaryOf, tailKey, tailOf } from './records'

const budget = { threads: 40, bytes: 30_000_000 }

interface KeptEntries {
  map: Map<string, Entry>
  ids: Set<string>
  bytes: number
  tail: string
}

export interface Written {
  summaries: Map<string, string>
  kept: Map<string, KeptEntries>
  bytes: Map<string, number>
}

export const blankWritten = (): Written => ({ summaries: new Map(), kept: new Map(), bytes: new Map() })

export const copyWritten = (written: Written): Written => ({
  summaries: new Map(written.summaries),
  kept: new Map(written.kept),
  bytes: new Map(written.bytes),
})

export const isStale = (written: Written, thread: Thread) => {
  if (written.summaries.get(thread.id) !== summaryKey(thread)) return true
  if (!thread.entries.size) return false
  const old = written.kept.get(thread.id)
  return !old || old.map !== thread.entries || old.ids.size !== thread.entries.size || old.tail !== tailKey(tailOf(thread))
}

export const writeBatch = (pick: PickStore, scope: string, next: Written) => {
  const writeEntries = (thread: Thread) => {
    const old = next.kept.get(thread.id)
    const tail = tailOf(thread)
    const tailed = tailKey(tail)
    const fresh = !old || old.map !== thread.entries
    if (!fresh && old.ids.size === thread.entries.size && old.tail === tailed) return
    if (fresh) pick('entries').delete(under(scope, thread.id))
    const ids = fresh ? new Set<string>() : new Set(old.ids)
    let bytes = fresh ? 0 : old.bytes
    for (const entry of thread.entries.values()) {
      if (ids.has(entry.id)) continue
      pick('entries').put(entry, [scope, thread.id, entry.id])
      ids.add(entry.id)
      bytes += entrySize(entry)
    }
    if (fresh || old.tail !== tailed) pick('tails').put(tail, [scope, thread.id])
    next.kept.set(thread.id, { map: thread.entries, ids, bytes, tail: tailed })
    next.bytes.set(thread.id, bytes)
  }

  const dropEntries = (id: string) => {
    pick('tails').delete([scope, id])
    pick('entries').delete(under(scope, id))
    next.kept.delete(id)
    next.bytes.delete(id)
  }

  return {
    wipe() {
      for (const store of ['threads', 'tails', 'entries'] as const) pick(store).delete(under(scope))
    },
    write(thread: Thread) {
      const summary = summaryKey(thread)
      if (next.summaries.get(thread.id) !== summary) {
        pick('threads').put(summaryOf(thread), [scope, thread.id])
        next.summaries.set(thread.id, summary)
      }
      if (thread.entries.size) writeEntries(thread)
    },
    remove(id: string) {
      pick('threads').delete([scope, id])
      next.summaries.delete(id)
      dropEntries(id)
    },
    evict(opened: Map<string, number>, current: string | undefined) {
      const recent = [...next.bytes.keys()].sort((a, b) => (opened.get(b) ?? 0) - (opened.get(a) ?? 0))
      let total = 0
      let count = 0
      for (const id of recent) {
        total += next.bytes.get(id) ?? 0
        count++
        if (id !== current && (count > budget.threads || total > budget.bytes)) dropEntries(id)
      }
    },
  }
}
