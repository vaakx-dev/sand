import {
  type OpenedSession,
  sessionCheckout,
  sessionMove,
  sessionPin,
  sessionRemove,
  sessionRename,
  sessionSettle,
  sessionSnooze,
  sessionsCreate,
  sessionsQuick,
  uiFocus,
} from '@sand/server/contract'
import type { Pcs, Wire } from '@sand/devices-contract'
import { uuid } from '@sand/util'
import type { Context } from 'drydock'
import { type DraftTarget, type Thread, type Threads, threadSelect } from '../contract'
import { helloOf, onPcHello } from '../greeted'
import { onAddressChange } from '../integrations/address'
import { type Place, recordPlace, requestedPlace, requestedSession, samePlace, sessionLink, type Visit } from './address'
import { threadCreators } from './creators'
import { applyHello } from './hello'
import { threadLoader } from './loading'
import { threadPages } from './pages'
import { hasOlder, pathOf } from './path'
import type { Store } from './store'

export interface ThreadService extends Threads {
  adopt(opened: OpenedSession, device: string): Thread
  restored(): void
}

export const createThreads = (ctx: Context, wire: Wire, pcs: Pcs, store: Store, hydrate: (id: string) => Promise<void>): ThreadService => {
  const { install, load } = threadLoader(ctx, wire, store, hydrate)
  const pages = threadPages(wire, store)
  const creators = threadCreators()
  let greeted = false

  const recentFolder = () =>
    [...store.threads.values()]
      .filter(({ device, info }) => device === store.here() && info.kind === 'thread')
      .sort((a, b) => b.info.updated - a.info.updated)[0]?.info.cwd

  const cwd = () => store.currentThread()?.info.cwd ?? store.draft?.cwd ?? recentFolder() ?? ''

  const place = (): Place => ({ session: store.current, draft: store.draft })

  const show = (id: string | undefined, visit: Visit, draft?: DraftTarget) => {
    const from = place()
    store.current = id
    store.draft = id ? undefined : (draft ?? store.draft ?? { id: uuid(), cwd: cwd(), device: store.here() })
    recordPlace(from, place(), visit)
    ctx.emit(threadSelect, id)
    store.changed(id, true)
    return id ? store.threads.get(id) : undefined
  }

  const open = async (id: string | undefined, visit: Visit, draft?: DraftTarget) => {
    const thread = show(id, visit, draft)
    void wire.call(uiFocus, id ? { session: id } : {}).catch(() => {})
    if (id && !thread?.loaded) await load(id)
  }

  const select = (id: string | undefined, options?: { replace?: boolean }) => open(id, options?.replace ? 'replace' : 'push')

  const refocus = (device: string) => {
    const current = store.currentThread()
    void wire.call(uiFocus, current?.device === device ? { session: current.id } : {}, device).catch(() => {})
  }

  const openRequested = async () => {
    const { session, draft } = requestedPlace()
    if (session && !store.threads.has(session)) await load(session)
    await open(session && store.threads.has(session) ? session : undefined, 'replace', draft)
  }

  const revisit = async () => {
    const asked = requestedPlace()
    const { session, draft } = asked
    if (!greeted || samePlace(asked, place())) return
    if (session && !store.threads.has(session)) await load(session)
    if (requestedSession() !== session) return
    await open(session && store.threads.has(session) ? session : undefined, 'restore', draft)
  }

  const created = async (target: DraftTarget) => {
    const claimed = creators.claim(target)
    if (claimed) return claimed
    if (!target.cwd) return wire.call(sessionsQuick, {}, target.device)
    return wire.call(sessionsCreate, { cwd: target.cwd }, target.device)
  }

  const greetedBy = (pc: string) => {
    applyHello(store, helloOf(wire, pc), pc)
    if (pc !== store.here()) {
      refocus(pc)
      const current = store.currentThread()
      if (current?.device === pc) void load(current.id)
      return
    }
    if (greeted) return void open(store.current, 'replace')
    greeted = true
    void openRequested()
  }

  onPcHello(ctx, wire, pcs, greetedBy)
  ctx.effect(() => onAddressChange(() => void revisit()))

  return {
    adopt: install,
    restored() {
      const asked = requestedSession()
      if (!greeted && asked && store.threads.has(asked)) show(asked, 'replace')
    },
    cwd,
    device: () => store.device(),
    draft: (folder, device, id = uuid()) => open(undefined, 'push', { id, cwd: folder, device }),
    drafting: () => (store.current ? undefined : store.draft),
    list: () => [...store.threads.values()],
    get: id => store.threads.get(id),
    current: () => store.currentThread(),
    children: id => [...store.threads.values()].filter(chat => chat.info.parent === id),
    async create({ id = uuid(), cwd, device }) {
      const thread = store.upsert(await created({ id, cwd, device }), device)
      thread.loaded = true
      return thread
    },
    creator: creators.add,
    async rename(id, title) {
      await wire.call(sessionRename, { session: id, title }, store.deviceOf(id))
    },
    async pin(id, pinned) {
      await wire.call(sessionPin, { session: id, pinned }, store.deviceOf(id))
    },
    async settle(id, settled) {
      await wire.call(sessionSettle, { session: id, settled }, store.deviceOf(id))
    },
    async snooze(id, until) {
      await wire.call(sessionSnooze, { session: id, until }, store.deviceOf(id))
    },
    async move(id, position) {
      await wire.call(sessionMove, { session: id, position }, store.deviceOf(id))
    },
    async remove(id) {
      await wire.call(sessionRemove, { session: id }, store.deviceOf(id))
      if (store.current === id) await select(undefined, { replace: true })
      store.remove(id)
    },
    select,
    load,
    path: (id, options) => {
      const thread = store.threads.get(id)
      return thread ? pathOf(thread, options?.carried) : []
    },
    link: sessionLink,
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
  }
}
