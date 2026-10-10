import type { Thread } from '../contract'
import type { Store } from '../threads/store'
import type { CachedScope } from './reads'
import type { CachedThread } from './records'

export const fillThread = (thread: Thread, { tail, entries }: CachedThread) => {
  const filled = new Map(entries.map(entry => [entry.id, entry]))
  for (const [id, entry] of thread.entries) filled.set(id, entry)
  thread.entries = filled
  thread.cursor = tail.cursor
  thread.complete = tail.complete
  thread.floor = tail.floor
  thread.carried = tail.carried
  thread.cached = true
}

export const restoreScope = (store: Store, { meta, summaries }: CachedScope) => {
  for (const { device, info } of summaries) {
    if (store.threads.has(info.id)) continue
    store.upsert(info, device ?? undefined).cached = true
  }
  for (const [device, token] of Object.entries(meta.synced)) if (!store.synced.has(device)) store.synced.set(device, token)
}
