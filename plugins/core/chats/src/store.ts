import type { Database } from 'bun:sqlite'
import { createEntryCache } from './cache'
import type { ChatPatch, Session, SessionInfo, Sessions } from './contract'
import { createPaging } from './paging'
import { entryColumns, parseRow, type Row } from './paging/rows'
import { firstTitle, quickTasks } from './quick'
import { chatRecords } from './records'
import { relocator } from './relocate'
import { chatRemover } from './remove'
import { createSession, type SessionHooks } from './session'
import { childSummaries, summaries, syncedSummaries } from './summaries'

const loadedLimit = 20

export interface StoreOptions {
  hooks: SessionHooks & { archive(session: Session): void; remove(id: string): void }
  busy(session: Session): Promise<boolean>
  closing(session: Session): Promise<string | undefined>
  projectOf(cwd: string): string | null
  knownProject(id: string): boolean
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
  archived: null,
  snoozed: null,
  position: null,
  ...chat,
})

const pinPatch = (pinned: boolean): ChatPatch => (pinned ? { pinned, archived: null, snoozed: null } : { pinned })

const snoozePatch = (until: number | null): ChatPatch => (until === null ? { snoozed: null } : { snoozed: until, archived: null })

export const createStore = (db: Database, { hooks, busy, closing, projectOf, knownProject, scratch }: StoreOptions) => {
  const opened = new Map<string, Session>()
  const running = async (id: string) => {
    const session = opened.get(id)
    return session !== undefined && busy(session)
  }
  const cache = createEntryCache(loadedLimit, running)
  const paging = createPaging(db)
  const records = chatRecords(db)
  const removeChats = chatRemover(db)
  const tasks = quickTasks(scratch)
  const children = childSummaries(db)
  const ofType = db.query<Row, { type: string }>(`select ${entryColumns} from entries e where e.type = $type order by e.at`)
  const inSession = db.query<Row, { session: string; type: string }>(`select ${entryColumns} from entries e where e.session = $session and e.type = $type order by e.at`)

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
    if (session.kind === 'agent') throw new Error(`Chat ${id} is a subagent`)
    return session
  }

  const close = async (session: Session) => {
    if (await busy(session)) throw new Error('Stop the thread first')
    const refusal = await closing(session)
    if (refusal) throw new Error(refusal)
  }

  const checked = (project: string | null) => {
    if (project !== null && !knownProject(project)) throw new Error(`Project ${project} has no folder on this PC`)
    return project
  }

  const relocate = relocator({ running, children, patch: records.patch, checked, update: hooks.update })

  const sessions: Sessions = {
    thread: (cwd, options) =>
      create({ cwd, project: options?.project === undefined ? projectOf(cwd) : checked(options.project), kind: 'thread' }),
    quick() {
      const id = Bun.randomUUIDv7()
      return create({ id, cwd: tasks.folder(id), project: null, kind: 'quick' })
    },
    agent: ({ parent, cwd, project, title, origin }) =>
      create({ cwd, project: project === undefined ? projectOf(cwd) : checked(project), kind: 'agent', parent: parent ?? null, title, origin: origin ?? null }),
    children,
    update(id, patch) {
      const session = sessions.require(id)
      const archived = session.archived
      records.patch(id, patch)
      Object.assign(session, patch)
      hooks.update(session)
      if (session.archived !== archived) hooks.archive(session)
      return session
    },
    relocate: (id, relocation) => relocate(sessions.require(id), relocation),
    rename(id, title) {
      sessions.update(id, { title })
    },
    pin: (id, pinned) => sessions.update(topLevel(id).id, pinPatch(pinned)),
    async archive(id, archived) {
      const session = sessions.require(id)
      if (!archived) return sessions.update(id, { archived: null })
      await close(session)
      return sessions.update(id, { archived: Date.now(), pinned: false, snoozed: null })
    },
    snooze: (id, until) => sessions.update(topLevel(id).id, snoozePatch(until)),
    async remove(id) {
      const session = topLevel(id)
      await close(session)
      for (const chat of removeChats(id)) {
        forget(chat)
        hooks.remove(chat)
      }
      if (session.kind === 'quick') await tasks.removeFolder(id)
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
    entriesIn: (session, type) => inSession.all({ session, type }).map(parseRow),
  }

  return { sessions, forget }
}
