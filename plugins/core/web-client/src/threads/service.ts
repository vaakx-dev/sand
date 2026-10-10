import type { Hello } from '@sand/protocol'
import type { OpenedSession } from '@sand/server/contract'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { NewThread, Thread, Threads, Wire } from '../contract'
import { isInside, uuid } from '@sand/kit'
import type { Context } from 'drydock'
import { requestedSession, sessionLink, showSession } from './address'
import { followHeads } from './heads'
import { applyHello } from './hello'
import { threadLoader } from './loading'
import { threadPages } from './pages'
import { hasOlder, pathOf } from './path'
import { trackSeen } from './seen'
import type { Store } from './store'

type Extra = { adopt(opened: OpenedSession, device?: string): Thread; restored(): void }

export const createThreads = (ctx: Context, wire: Wire, store: Store, hydrate: (id: string) => Promise<void>): Threads & Extra => {
  const { install, load } = threadLoader(ctx, wire, store, hydrate)
  const pages = threadPages(wire, store)

  const focus = (id: string | undefined) => void wire.call({ type: 'ui.focus', ...(id && { session: id }) }).catch(() => {})

  const show = (id: string | undefined, idle = false) => {
    store.idle = !id && idle
    store.current = id
    if (id) store.draft = undefined
    else store.draft ??= { id: uuid(), cwd: cwd() }
    const thread = id ? store.threads.get(id) : undefined
    if (thread) thread.unread = false
    showSession(id)
    ctx.emit('thread.select', id)
    store.changed(id, true)
    return thread
  }

  const open = async (id: string | undefined, idle = false) => {
    const thread = show(id, idle)
    focus(id)
    if (id && !thread?.loaded) await load(id)
  }

  const select = (id: string | undefined) => open(id)

  let greeted = false

  const restored = () => {
    const asked = requestedSession()
    if (!greeted && asked && store.threads.has(asked)) show(asked)
  }

  const openAsked = async (asked: string | undefined) => {
    if (asked && !store.threads.has(asked)) await load(asked)
    await open(asked && store.threads.has(asked) ? asked : undefined, true)
  }

  const greet = (hello: Hello) => {
    applyHello(store, hello)
    const first = !greeted
    greeted = true
    if (first) void openAsked(requestedSession())
    else void open(store.current, store.idle)
  }

  ctx.on('wire.hello', greet)
  trackSeen(ctx, wire, store)
  followHeads(ctx, store, load)

  const call = (request: Parameters<Wire['call']>[0]) => wire.call(request).then(() => undefined)
  const missing = (path: string) => Boolean(ctx.projects?.list().some(project => !project.device && project.path === path && project.missing))
  const recentFolder = () => {
    const scratch = wire.hello()?.scratch ?? ''
    return [...store.threads.values()]
      .filter(
        thread =>
          !thread.device &&
          thread.info.kind !== 'agent' &&
          thread.info.cwd &&
          !isInside(thread.info.cwd, scratch) &&
          !missing(thread.info.cwd),
      )
      .sort((a, b) => b.info.updated - a.info.updated)[0]?.info.cwd
  }

  const cwd = () => {
    const current = store.current ? store.threads.get(store.current) : undefined
    if (current) return current.info.cwd
    if (store.draft) return store.draft.cwd
    return recentFolder() ?? ''
  }

  return {
    adopt: install,
    restored,
    cwd,
    device: () => store.device(),
    async draft(folder, device, id = uuid()) {
      store.draft = { id, cwd: folder, device }
      await select(undefined)
    },
    drafting: () => (store.current ? undefined : store.draft),
    idle: () => store.idle,
    list: () => [...store.threads.values()],
    get: id => store.threads.get(id),
    current: () => (store.current ? store.threads.get(store.current) : undefined),
    select,
    load,
    async create(options: NewThread = {}) {
      const device = options.cwd ? options.device : store.device()
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
      const device = store.threads.get(id)?.device
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
  }
}
