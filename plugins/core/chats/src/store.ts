import type { Database } from 'bun:sqlite'
import { createEntryCache } from './cache'
import type { ChatPatch, Session, SessionInfo, Sessions } from './contract'
import { createPaging } from './paging'
import { parseRow, type Row } from './paging/rows'
import { firstTitle, quickTasks } from './quick'
import { chatRecords } from './records'
import { chatRemover } from './remove'
import { createSession, type SessionHooks } from './session'
import { childSummaries, summaries, syncedSummaries } from './summaries'

const loadedLimit = 20

export interface StoreOptions {
  hooks: SessionHooks & { remove(id: string): void }
  running(id: string): boolean
  closing(session: Session): Promise<string | undefined>
  projectOf(cwd: string): string | null
  scratch(id: string): string
}

type NewChat = Pick<SessionInfo, 'cwd' | 'project' | 'kind'> & Partial<SessionInfo>

const blank = (chat: NewChat): SessionInfo => ({
  id: Bun.randomUUIDv7(),
  created: Date.now(),
  head: null,
  parent: null,
  origin: null,
  title: '',
  seen: true,
  pinned: false,
  settled: null,
  snoozed: null,
  position: null,
  ...chat,
})

const pinPatch = (pinned: boolean): ChatPatch => (pinned ? { pinned, settled: null, snoozed: null } : { pinned })

const snoozePatch = (until: number | null): ChatPatch => (until === null ? { snoozed: null } : { snoozed: until, settled: null })

export const createStore = (db: Database, { hooks, running, closing, projectOf, scratch }: StoreOptions) => {
  const opened = new Map<string, Session>()
  const cache = createEntryCache(loadedLimit, running)
  const paging = createPaging(db)
  const records = chatRecords(db)
  const removeChats = chatRemover(db)
  const tasks = quickTasks(scratch)
  const ofType = db.query<Row, { type: string }>('select * from entries where type = $type order by at')

  const sessionHooks: SessionHooks = {
    entry(session, entry) {
      const title = firstTitle(session, entry)
      if (title) sessions.update(session.id, { title })
      hooks.entry(session, entry)
    },
    update: hooks.update,
  }

  const forget = (id: string) => {
    opened.delete(id)
    cache.forget(id)
  }

  const remember = (info: SessionInfo) => {
    const known = opened.get(info.id)
    if (known) return known
    const session = createSession(db, info, sessionHooks, cache, paging)
    opened.set(info.id, session)
    return session
  }

  const create = (chat: NewChat) => {
    const info = blank(chat)
    records.insert(info)
    const session = remember(info)
    hooks.update(session)
    return session
  }

  const topLevel = (id: string) => {
    const session = sessions.require(id)
    if (session.kind === 'agent') throw new Error(`Chat ${id} is a sub-agent`)
    return session
  }

  const close = async (session: Session) => {
    if (running(session.id)) throw new Error('Stop the thread first')
    const refusal = await closing(session)
    if (refusal) throw new Error(refusal)
  }

  const sessions: Sessions = {
    thread: cwd => create({ cwd, project: projectOf(cwd), kind: 'thread' }),
    quick() {
      const id = Bun.randomUUIDv7()
      return create({ id, cwd: tasks.folder(id), project: null, kind: 'quick' })
    },
    agent({ parent, title, origin }) {
      const { cwd, project } = sessions.require(parent)
      return create({ cwd, project, kind: 'agent', parent, title, origin: origin ?? null })
    },
    children: childSummaries(db),
    update(id, patch) {
      const session = sessions.require(id)
      records.patch(id, patch)
      Object.assign(session, patch)
      hooks.update(session)
      return session
    },
    rename(id, title) {
      sessions.update(id, { title })
    },
    pin: (id, pinned) => sessions.update(topLevel(id).id, pinPatch(pinned)),
    async settle(id, settled) {
      const session = topLevel(id)
      if (!settled) return sessions.update(id, { settled: null })
      await close(session)
      return sessions.update(id, { settled: Date.now(), pinned: false, snoozed: null })
    },
    snooze: (id, until) => sessions.update(topLevel(id).id, snoozePatch(until)),
    move: (id, position) => sessions.update(topLevel(id).id, { position }),
    async remove(id) {
      const session = topLevel(id)
      await close(session)
      const removed = removeChats(id)
      if (session.kind === 'quick') await tasks.removeFolder(id)
      for (const chat of removed) {
        forget(chat)
        hooks.remove(chat)
      }
    },
    open(id) {
      const row = opened.has(id) ? undefined : records.find(id)
      return opened.get(id) ?? (row ? remember(row) : undefined)
    },
    require(id) {
      const session = sessions.open(id)
      if (!session) throw new Error(`No chat ${id}`)
      return session
    },
    list: summaries(db),
    synced: syncedSummaries(db),
    entriesOfType: type => ofType.all({ type }).map(parseRow),
  }

  return { sessions, forget }
}
