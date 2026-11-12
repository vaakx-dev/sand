import { contextGet } from '@sand/compaction/contract'
import { type OpenedSession, sessionOpen, sessionSince } from '@sand/server/contract'
import type { Wire } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import type { Context } from 'drydock'
import { modelsChange, type Thread, threadChange } from '../contract'
import { after } from '../detached'
import { catchUp } from './live'
import { merge, turnStart } from './path'
import type { Store } from './store'

const retryDelay = 600

const wait = (ms: number) => new Promise<void>(resolve => after(ms, resolve))

export const threadLoader = (ctx: Context, wire: Wire, store: Store, hydrate: (id: string) => Promise<void> | undefined) => {
  const loading = new Map<string, Promise<Thread | undefined>>()

  const apply = (thread: Thread, opened: OpenedSession) => {
    merge(thread, opened.entries)
    thread.cached = false
    thread.info = { ...thread.info, head: opened.info.head }
    thread.cursor = opened.info.head ?? undefined
    thread.loaded = true
    thread.failed = undefined
    if (opened.live || !thread.turn) catchUp(thread, { live: opened.live ?? [], tools: opened.tools ?? [], mark: opened.mark })
    if (thread.turn) thread.started ??= turnStart(thread)
    if (opened.pending) store.pending(thread.id, opened.pending)
    if (opened.settings) store.settings.set(thread.id, opened.settings)
    void wire.call(contextGet, { session: thread.id, owner: 'thread' }).then(usage => store.context(thread.id, usage), () => {})
    store.changed(thread.id, true)
    ctx.emit(modelsChange)
    return thread
  }

  const install = (opened: OpenedSession, device = store.deviceOf(opened.info.id)) => {
    const thread = store.upsert(opened.info, device)
    thread.complete = !opened.partial
    thread.carried = opened.carried ?? []
    thread.floor = undefined
    return apply(thread, opened)
  }

  const reconnecting = (id: string) => !wire.ready(store.deviceOf(id))

  const fail = (id: string, error: unknown) => {
    const thread = store.threads.get(id)
    if (!thread || thread.loaded || reconnecting(id)) return
    thread.failed = errorMessage(error)
    store.changed(id)
  }

  const open = async (id: string) => {
    const request = () => wire.call(sessionOpen, { session: id })
    const opened = await request().catch(error => (reconnecting(id) ? Promise.reject(error) : wait(retryDelay).then(request)))
    return install(opened)
  }

  const resume = (thread: Thread, cursor: string) => {
    const after = thread.entries.get(cursor)?.seq ?? cursor
    return wire.call(sessionSince, { session: thread.id, after }).then(
      delta => (delta ? apply(store.upsert(delta.info, thread.device), delta) : open(thread.id)),
      () => open(thread.id),
    )
  }

  const request = (id: string) => {
    const thread = store.threads.get(id)
    return thread?.cursor && thread.entries.size ? resume(thread, thread.cursor) : open(id)
  }

  const fetchThread = (id: string) => {
    const reading = hydrate(id)
    return reading ? reading.then(() => request(id)) : request(id)
  }

  const load = (id: string) => {
    const existing = loading.get(id)
    if (existing) return existing
    const thread = store.threads.get(id)
    if (thread?.failed) {
      thread.failed = undefined
      store.changed(id)
    }
    const request = fetchThread(id)
      .catch(error => void fail(id, error))
      .finally(() => loading.delete(id))
    loading.set(id, request)
    return request
  }

  ctx.on(threadChange, id => {
    const thread = store.open(id) ? store.threads.get(id) : undefined
    const head = thread?.info.head
    if (thread?.loaded && head && !thread.entries.has(head)) void load(id)
  })

  return { install, load }
}
