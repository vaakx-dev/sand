import type { Hello, NewThread, OpenedSession, SessionInfo, Thread, Threads, Wire } from '@sand/protocol'
import { uuid } from '@sand/kit'
import type { Context } from 'drydock'
import { requestedFolder, requestedSession, showSession } from './address'
import { threadLoader } from './loading'
import { trackSeen } from './seen'
import { walk, type Store } from './store'

const preloadCount = 6

export const createThreads = (ctx: Context, wire: Wire, store: Store): Threads & { adopt(opened: OpenedSession, device?: string): Thread } => {
  const { install, load } = threadLoader(ctx, wire, store)

  const focus = (id: string | undefined) => void wire.call({ type: 'ui.focus', ...(id && { session: id }) }).catch(() => {})

  const open = async (id: string | undefined, idle = false) => {
    store.idle = !id && idle
    store.current = id
    if (id) store.draft = undefined
    else store.draft ??= { id: uuid(), cwd: cwd() }
    const thread = id ? store.threads.get(id) : undefined
    if (thread) thread.unread = false
    focus(id)
    showSession(id)
    ctx.emit('thread.select', id)
    store.changed(id, true)
    if (thread && !thread.loaded) await load(thread.id)
  }

  const select = (id: string | undefined) => open(id)

  const visible = () =>
    [...store.threads.values()].filter(thread => thread.info.kind !== 'agent').sort((a, b) => b.info.updated - a.info.updated)

  const preload = async () => {
    const running = [...store.threads.values()].filter(thread => thread.running)
    for (const thread of [...running, ...visible().slice(0, preloadCount)]) if (!thread.loaded) await load(thread.id)
  }

  let greeted = false

  const greet = (hello: Hello) => {
    const known = new Set(hello.sessions.map(info => info.id))
    const local = () => [...store.threads.values()].filter(thread => !thread.device)
    for (const thread of local()) if (!known.has(thread.id)) store.remove(thread.id)
    for (const info of hello.sessions) store.upsert(info)
    for (const thread of local()) {
      thread.running = hello.active.includes(thread.id)
      if (!thread.running) thread.started = undefined
      thread.loaded = false
    }
    const asked = requestedSession()
    const first = !greeted
    greeted = true
    const target = first ? (asked && store.threads.has(asked) ? asked : undefined) : store.current
    void open(target, first || store.idle).then(preload)
  }

  ctx.on('wire.hello', greet)
  trackSeen(ctx, wire, store)

  const call = (request: Parameters<Wire['call']>[0]) => wire.call(request).then(() => undefined)
  const cwd = () =>
    (store.current && store.threads.get(store.current)?.info.cwd) || store.draft?.cwd || requestedFolder() || wire.hello()?.cwd || ''

  return {
    adopt: install,
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
      const info = await wire.call<SessionInfo>(
        { type: 'sessions.create', options: { id: uuid(), cwd: options.cwd ?? cwd(), title: options.title, settings: options.settings } },
        device,
      )
      const thread = store.upsert(info, device)
      thread.loaded = true
      return thread
    },
    path: id => {
      const thread = store.threads.get(id)
      return thread ? walk(thread.entries, thread.info.head) : []
    },
    rename: (id, title) => call({ type: 'session.rename', session: id, title, named: true }),
    remove: id => call({ type: 'sessions.remove', session: id }),
    async checkout(id, entry) {
      await call({ type: 'session.checkout', session: id, entry })
      const thread = store.threads.get(id)
      if (!thread) return
      thread.info = { ...thread.info, head: entry }
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
