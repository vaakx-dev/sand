import {
  type OpenedSession,
  sessionBranches,
  sessionCheckout,
  sessionRemove,
  uiFocus,
} from '@sand/server/contract'
import type { Pcs, Wire } from '@sand/devices-contract'
import { threadStart, threadUpdate } from '@sand/orchestrator/contract'
import { uuid } from '@sand/util'
import type { Context } from 'drydock'
import { draftStarted, type DraftTarget, type OpenChat, type Thread, type Threads, threadSelect } from '../contract'
import { helloOf, onPcHello } from '../greeted'
import { applyHello } from './hello'
import { threadLoader } from './loading'
import { threadPages } from './pages'
import { hasOlder, pathOf } from './path'
import type { Store } from './store'
import { threadWatches } from './watch'

export interface ThreadService extends Threads {
  adopt(opened: OpenedSession, device: string): Thread
}

export const createThreads = (ctx: Context, wire: Wire, pcs: Pcs, store: Store, hydrate: (id: string) => Promise<void> | undefined): ThreadService => {
  const { install, load } = threadLoader(ctx, wire, store, hydrate)
  const pages = threadPages(wire, store)
  const watches = threadWatches(wire, store, id => void load(id))

  const recentFolder = () =>
    [...store.threads.values()]
      .filter(({ device, info }) => device === store.here() && info.kind === 'thread')
      .sort((a, b) => b.info.updated - a.info.updated)[0]?.info.cwd

  const cwd = () => store.currentThread()?.info.cwd ?? store.draft?.cwd ?? recentFolder() ?? ''

  const plans = new Map<string, DraftTarget>()

  const opened = (): OpenChat | undefined => {
    if (store.current) return { thread: store.current }
    return store.draft && { draft: store.draft.id }
  }

  const sameChat = (a: OpenChat | undefined, b: OpenChat) => a !== undefined && ('thread' in a ? 'thread' in b && a.thread === b.thread : 'draft' in b && a.draft === b.draft)

  const plan = ({ id = uuid(), cwd: folder, device }: Omit<DraftTarget, 'id'> & { id?: string }) => {
    const target = { id, cwd: folder, device }
    plans.set(id, target)
    if (store.draft?.id === id) {
      store.draft = target
      ctx.emit(threadSelect, undefined)
      store.changed(undefined, true)
    }
    return target
  }

  const draftFor = (id: string) => plans.get(id) ?? plan({ id, cwd: cwd(), device: store.device() })

  const show = (chat: OpenChat) => {
    if (sameChat(opened(), chat)) return
    store.current = 'thread' in chat ? chat.thread : undefined
    store.draft = 'draft' in chat ? draftFor(chat.draft) : undefined
    ctx.emit(threadSelect, store.current)
    store.changed(store.current, true)
    void wire.call(uiFocus, store.current ? { session: store.current } : {}).catch(() => {})
    const thread = store.currentThread()
    if (store.current && !thread?.loaded) void load(store.current)
  }

  const refocus = (device: string) => {
    const current = store.currentThread()
    void wire.call(uiFocus, current?.device === device ? { session: current.id } : {}, device).catch(() => {})
  }

  const placeOf = ({ cwd: folder }: DraftTarget) => (folder ? { cwd: folder } : { quick: true as const })

  const greetedBy = (pc: string) => {
    applyHello(store, helloOf(wire, pc), pc)
    watches.greeted(pc)
    refocus(pc)
    const current = store.currentThread()
    if (current?.device === pc) void load(current.id)
  }

  onPcHello(ctx, wire, pcs, greetedBy)

  return {
    adopt: install,
    cwd,
    device: () => store.device(),
    plan,
    show,
    drafting: () => (store.current ? undefined : store.draft),
    list: () => [...store.threads.values()],
    get: id => store.threads.get(id),
    current: () => store.currentThread(),
    children: id => [...store.threads.values()].filter(chat => chat.info.parent === id),
    async start(draft, { prompt, label, settings }) {
      const sent = await wire.call(threadStart, { ...placeOf(draft), prompt, label, ...settings, origin: 'user', clientRequestId: draft.id }, draft.device)
      plans.delete(draft.id)
      ctx.emit(draftStarted, draft.id, sent.thread)
    },
    async update(id, change) {
      await wire.call(threadUpdate, { session: id, ...change })
    },
    async remove(id) {
      await wire.call(sessionRemove, { session: id }, store.deviceOf(id))
      store.remove(id)
    },
    watch: watches.watch,
    load,
    path: (id, options) => {
      const thread = store.threads.get(id)
      return thread ? pathOf(thread, options?.carried) : []
    },
    older: id => {
      const thread = store.threads.get(id)
      return thread ? hasOlder(thread) : false
    },
    page: pages.page,
    findLast: pages.findLast,
    full: pages.full,
    async checkout(id, entry) {
      await wire.call(sessionCheckout, { session: id, entry })
      const thread = store.threads.get(id)
      if (!thread) return
      thread.info = { ...thread.info, head: entry }
      if (entry && !thread.entries.has(entry)) await load(id)
      store.changed(id, true)
    },
    branches: (id, entry) => wire.call(sessionBranches, { session: id, entry }),
  }
}
