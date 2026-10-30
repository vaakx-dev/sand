import type { Entry } from '@sand/chats/contract'
import { sessionEntries, sessionPage } from '@sand/server/contract'
import type { Wire } from '@sand/devices-contract'
import { hasOlder, loadedPath, merge } from './path'
import type { Store } from './store'

export const threadPages = (wire: Wire, store: Store) => {
  const pending = new Map<string, Promise<void>>()

  const once = (key: string, run: () => Promise<void>) => {
    const existing = pending.get(key)
    if (existing) return existing
    const request = run()
      .catch(() => {})
      .finally(() => pending.delete(key))
    pending.set(key, request)
    return request
  }

  const page = (id: string) =>
    once(`page:${id}`, async () => {
      const thread = store.threads.get(id)
      const path = thread ? loadedPath(thread) : []
      const oldest = path[0]
      if (!thread || !oldest || !hasOlder(thread, path)) return
      const result = await wire.call(sessionPage, { session: id, before: oldest.id })
      merge(thread, result.entries)
      if (!result.entries.length) thread.floor = oldest.id
      store.changed(id)
    })

  const full = (id: string) =>
    once(`full:${id}`, async () => {
      const thread = store.threads.get(id)
      if (!thread || thread.complete) return
      merge(thread, await wire.call(sessionEntries, { session: id }))
      thread.complete = true
      store.changed(id)
    })

  const findLast = async (id: string, test: (entry: Entry) => boolean) => {
    for (let size = -1; ; ) {
      const thread = store.threads.get(id)
      const path = thread ? loadedPath(thread) : []
      const found = path.findLast(test)
      if (found || !thread || path.length === size || !hasOlder(thread, path)) return found
      size = path.length
      await page(id)
    }
  }

  return { page, full, findLast }
}
