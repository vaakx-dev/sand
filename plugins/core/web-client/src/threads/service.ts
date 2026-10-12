import type { WireRequest } from '@sand/protocol'
import type { OpenedSession } from '@sand/server/contract'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { DraftTarget, NewThread, Projects, Thread, Threads, Wire } from '../contract'
import { isInside, uuid } from '@sand/kit'
import { onAddressChange } from '@sand/kit/web'
import type { Context } from 'drydock'
import { behindSession, recordPlace, requestedPlace, requestedSession, samePlace, sessionLink, type Place, type Visit } from './address'
import { applyHello } from './hello'
import { threadLoader } from './loading'
import { threadPages } from './pages'
import { hasOlder, pathOf } from './path'
import { trackSeen } from './seen'
import type { Store } from './store'

export interface ThreadService extends Threads {
  adopt(opened: OpenedSession, device: string): Thread
  restored(): void
}

interface Showing {
  idle?: boolean
  draft?: DraftTarget
}

export const createThreads = (
  ctx: Context,
  wire: Wire,
  store: Store,
  projects: Projects,
  hydrate: (id: string) => Promise<void>,
): ThreadService => {
  const { install, load } = threadLoader(ctx, wire, store, hydrate)
  const pages = threadPages(wire, store)
  let greeted = false

  const missing = (path: string) => projects.list().some(project => project.device === store.here() && project.path === path && project.missing)

  const recentFolder = () => {
    const scratch = wire.hello()?.scratch ?? ''
    const usable = ({ device, info }: Thread) =>
      device === store.here() && info.kind !== 'agent' && info.cwd && !isInside(info.cwd, scratch) && !missing(info.cwd)
    return [...store.threads.values()].filter(usable).sort((a, b) => b.info.updated - a.info.updated)[0]?.info.cwd
  }

  const cwd = () => store.currentThread()?.info.cwd ?? store.draft?.cwd ?? recentFolder() ?? ''

  const place = (): Place => ({ session: store.current, draft: store.draft })

  const show = (id: string | undefined, visit: Visit, { idle = false, draft }: Showing = {}) => {
    const from = place()
    store.idle = !id && idle
    store.current = id
    store.draft = id ? undefined : (draft ?? store.draft ?? { id: uuid(), cwd: cwd(), device: store.here() })
    const thread = id ? store.threads.get(id) : undefined
    if (thread) thread.unread = false
    recordPlace(from, place(), visit)
    ctx.emit('thread.select', id)
    store.changed(id, true)
    return thread
  }

  const open = async (id: string | undefined, visit: Visit, showing?: Showing) => {
    const thread = show(id, visit, showing)
    void wire.call({ type: 'ui.focus', ...(id && { session: id }) }).catch(() => {})
    if (id && !thread?.loaded) await load(id)
  }

  const select = (id: string | undefined, options?: { replace?: boolean }) => open(id, options?.replace ? 'replace' : 'push')

  const openRequested = async () => {
    const { session, draft } = requestedPlace()
    if (session && !store.threads.has(session)) await load(session)
    if (session && !store.threads.has(session)) return open(undefined, 'restore', { idle: true, draft })
    await open(session, 'replace', { idle: true, draft })
  }

  const openWhenListed = () => {
    const asked = requestedSession()
    if (greeted && asked && !store.current && store.threads.has(asked)) void open(asked, 'replace')
  }

  const revisit = async () => {
    const asked = requestedPlace()
    const { session, draft } = asked
    if (!greeted || samePlace(asked, place())) return
    if (!session) return open(undefined, 'restore', { draft })
    if (!store.threads.has(session)) await load(session)
    if (requestedSession() !== session) return
    if (store.threads.has(session)) return open(session, 'restore')
    ctx.notify?.push("Couldn't open that thread", { level: 'error' })
    await open(undefined, 'restore', { idle: true })
  }

  ctx.on('wire.hello', hello => {
    applyHello(store, hello, store.here())
    if (greeted) return void open(store.current, 'replace', { idle: store.idle })
    greeted = true
    void openRequested()
  })
  ctx.on('threads.change', openWhenListed)
  ctx.effect(() => onAddressChange(() => void revisit()))
  trackSeen(ctx, wire, store)

  const call = (request: WireRequest) => wire.call(request).then(() => undefined)

  return {
    adopt: install,
    restored() {
      const asked = requestedSession()
      if (!greeted && asked && store.threads.has(asked)) show(asked, 'replace')
    },
    cwd,
    device: () => store.device(),
    draft: (folder, device, id = uuid()) => open(undefined, 'push', { draft: { id, cwd: folder, device } }),
    drafting: () => (store.current ? undefined : store.draft),
    idle: () => store.idle,
    list: () => [...store.threads.values()],
    get: id => store.threads.get(id),
    current: () => store.currentThread(),
    select,
    async back(id) {
      if (behindSession() === id) return history.back()
      await select(id)
    },
    load,
    async create(options: NewThread = {}) {
      const device = options.device ?? (options.cwd ? store.here() : store.device())
      const folder = options.cwd ?? cwd()
      const info = await wire.call<SessionInfo>(
        {
          type: 'sessions.create',
          options: { id: uuid(), ...(folder && { cwd: folder }), title: options.title, settings: options.settings },
        },
        device,
      )
      const thread = store.upsert(info, device)
      thread.loaded = true
      return thread
    },
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
    children: pages.children,
    rename: (id, title) => call({ type: 'session.rename', session: id, title, named: true }),
    remove: id => call({ type: 'sessions.remove', session: id }),
    async checkout(id, entry) {
      await call({ type: 'session.checkout', session: id, entry })
      const thread = store.threads.get(id)
      if (!thread) return
      thread.info = { ...thread.info, head: entry }
      if (entry && !thread.entries.has(entry)) await load(id)
      store.changed(id, true)
    },
    async branch(id, at) {
      const info = await wire.call<SessionInfo>({ type: 'sessions.branch', session: id, into: uuid(), at })
      const device = store.deviceOf(id)
      store.upsert(info, device)
      return (await load(info.id)) ?? store.upsert(info, device)
    },
    pin: (id, pinned) => call({ type: 'session.pin', session: id, pinned }),
    settle: (id, settled) => call({ type: 'session.settle', session: id, settled }),
    snooze: (id, until) => call({ type: 'session.snooze', session: id, until }),
    move(id, position) {
      const thread = store.threads.get(id)
      if (thread) {
        thread.info = { ...thread.info, position }
        store.changed(id, true)
      }
      return call({ type: 'session.move', session: id, position })
    },
    command: (name, args = '') => call({ type: 'ui.command', name, args, session: store.currentThread()?.id, cwd: cwd() }),
  }
}
