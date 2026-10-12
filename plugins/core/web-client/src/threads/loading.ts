import type { ContextUsage } from '@sand/compaction/contract'
import type { OpenedSession } from '@sand/server/contract'
import type { Thread, Wire } from '../contract'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'
import { after } from '../detached'
import { catchUp } from './live'
import { merge, turnStart } from './path'
import type { Store } from './store'

const retryDelay = 600

const wait = (ms: number) => new Promise<void>(resolve => after(ms, resolve))

interface Resumed {
  thread?: Thread
  replace?: boolean
}

export const threadLoader = (ctx: Context, wire: Wire, store: Store, hydrate: (id: string) => Promise<void>) => {
  const loading = new Map<string, Promise<Thread | undefined>>()

  const apply = (thread: Thread, opened: OpenedSession) => {
    merge(thread, opened.entries)
    thread.cached = false
    thread.info = { ...thread.info, head: opened.info.head }
    thread.cursor = opened.info.head ?? undefined
    thread.loaded = true
    thread.failed = undefined
    if (opened.live || !thread.running) catchUp(thread, { live: opened.live ?? [], tools: opened.tools ?? [] })
    if (thread.running) thread.started ??= turnStart(thread)
    if (opened.queue) store.queue(thread.id, opened.queue)
    if (opened.settings) store.settings.set(thread.id, opened.settings)
    void wire.call<ContextUsage | undefined>({ type: 'context.get', session: thread.id }).then(usage => store.context(thread.id, usage), () => {})
    store.changed(thread.id, true)
    ctx.emit('models.change')
    return thread
  }

  const install = (opened: OpenedSession, device = store.deviceOf(opened.info.id)) => {
    const thread = store.upsert(opened.info, device)
    thread.complete = !opened.partial
    thread.carried = opened.carried ?? []
    thread.floor = undefined
    return apply(thread, opened)
  }

  const reconnecting = (id: string) => store.deviceOf(id) === store.here() && wire.state() !== 'open'

  const fail = (id: string, error: unknown) => {
    const thread = store.threads.get(id)
    if (!thread || thread.loaded || reconnecting(id)) return
    thread.failed = errorMessage(error)
    store.changed(id)
  }

  const resume = async (id: string): Promise<Resumed> => {
    const thread = store.threads.get(id)
    if (!thread?.cursor || !thread.entries.size) return {}
    try {
      const delta = await wire.call<OpenedSession | null>({ type: 'session.since', session: id, after: thread.cursor })
      return delta ? { thread: apply(store.upsert(delta.info, thread.device), delta) } : { replace: true }
    } catch {
      return {}
    }
  }

  const open = async (id: string, replace = false) => {
    const request = () => wire.call<OpenedSession>({ type: 'session.open', session: id })
    const opened = await request().catch(error => (reconnecting(id) ? Promise.reject(error) : wait(retryDelay).then(request)))
    const known = store.threads.get(id)
    if (replace && known) known.entries = new Map()
    return install(opened)
  }

  const fetchThread = async (id: string) => {
    await hydrate(id).catch(() => {})
    const resumed = await resume(id)
    return resumed.thread ?? open(id, resumed.replace)
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

  ctx.on('thread.change', id => {
    const thread = id === store.current ? store.threads.get(id) : undefined
    const head = thread?.info.head
    if (thread?.loaded && head && !thread.entries.has(head)) void load(id)
  })

  return { install, load }
}
