import type { ContextUsage, OpenedSession, Thread, Wire } from '@sand/protocol'
import { onTimeout } from '@sand/dom'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'
import { turnStart } from './started'
import type { Store } from './store'

const retryDelay = 600

const wait = (ms: number) => new Promise<void>(resolve => onTimeout(resolve, ms))

export const threadLoader = (ctx: Context, wire: Wire, store: Store) => {
  const loading = new Map<string, Promise<Thread | undefined>>()

  const install = (opened: OpenedSession, device?: string) => {
    const thread = store.upsert(opened.info, device)
    for (const entry of opened.entries) thread.entries.set(entry.id, entry)
    thread.info = { ...thread.info, head: opened.info.head }
    thread.loaded = true
    thread.failed = undefined
    if (opened.live) {
      thread.live = opened.live
      thread.tools = { running: new Set(opened.tools ?? []), results: thread.tools.results }
    } else if (!thread.running) {
      thread.live = []
      thread.tools = { running: new Set(), results: thread.tools.results }
    }
    if (thread.running) thread.started ??= turnStart(thread)
    if (opened.queue) store.queue(thread.id, opened.queue)
    if (opened.settings) store.settings.set(thread.id, opened.settings)
    void wire.call<ContextUsage | undefined>({ type: 'context.get', session: thread.id }).then(usage => store.context(thread.id, usage), () => {})
    store.changed(thread.id, true)
    ctx.emit('models.change')
    return thread
  }

  const reconnecting = (id: string) => !store.threads.get(id)?.device && wire.state() !== 'open'

  const fail = (id: string, error: unknown) => {
    const thread = store.threads.get(id)
    if (!thread || thread.loaded || reconnecting(id)) return undefined
    thread.failed = errorMessage(error)
    store.changed(id)
    return undefined
  }

  const load = (id: string) => {
    const existing = loading.get(id)
    if (existing) return existing
    const thread = store.threads.get(id)
    if (thread?.failed) {
      thread.failed = undefined
      store.changed(id)
    }
    const open = () => wire.call<OpenedSession>({ type: 'session.open', session: id })
    const request = open()
      .catch(error => (reconnecting(id) ? Promise.reject(error) : wait(retryDelay).then(open)))
      .then(opened => install(opened))
      .catch(error => fail(id, error))
      .finally(() => loading.delete(id))
    loading.set(id, request)
    return request
  }

  return { install, load }
}
