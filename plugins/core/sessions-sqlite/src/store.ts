import type { Database } from 'bun:sqlite'
import { createEntryCache } from './cache'
import type { CreateSession, Session, SessionInfo, Sessions } from './contract'
import { rewriter } from './format/rewrite'
import { current, upgrade } from './format/upgrade'
import { remover, summaries } from './list'
import { createPaging } from './paging'
import { parseRow, type Row } from './paging/rows'
import { createSession, type SessionHooks } from './session'
import { syncedSummaries } from './sync/summaries'

const loadedLimit = 20

const insertSql =
  'insert into sessions (id, created, cwd, project, title, head, parent, origin, kind, format, seen, position) values ($id, $created, $cwd, $project, $title, $head, $parent, $origin, $kind, $format, $created, $created)'

export interface StoreOptions {
  hooks: SessionHooks & { remove(session: Session): void }
  running(id: string): boolean
  scratchFolder(id: string): string
  projectOf(cwd: string): string | null
}

export const createStore = (db: Database, { hooks, running, scratchFolder, projectOf }: StoreOptions) => {
  const opened = new Map<string, Session>()
  const cache = createEntryCache(loadedLimit, running)
  const paging = createPaging(db)
  const insert = db.query(insertSql)
  const find = db.query<SessionInfo, { id: string }>('select * from sessions where id = $id')
  const ofType = db.query<Row, { type: string }>('select * from entries where type = $type order by at')
  const rewrite = rewriter(db)
  const sync = syncedSummaries(db)
  const removeAll = remover(db)

  const forget = (id: string) => {
    opened.delete(id)
    cache.forget(id)
  }

  const remember = (info: SessionInfo) => {
    const session = createSession(db, info, hooks, cache, paging)
    opened.set(info.id, session)
    return session
  }

  const projectFor = ({ cwd, project }: CreateSession) => {
    if (!cwd) return null
    return project === undefined ? projectOf(cwd) : project
  }

  const sessions: Sessions = {
    create(options) {
      const { id = Bun.randomUUIDv7(), cwd, title, parent, origin, kind } = options
      const info: SessionInfo = {
        id,
        created: Date.now(),
        cwd: cwd || scratchFolder(id),
        project: projectFor(options),
        title: title ?? null,
        head: null,
        parent: parent ?? null,
        origin: origin ?? null,
        kind: kind ?? 'main',
        format: current,
      }
      insert.run({ ...info })
      const session = remember(info)
      hooks.update(session)
      return session
    },
    open(id) {
      const cached = opened.get(id)
      if (cached) return cached
      const info = find.get({ id })
      if (!info) return undefined
      return remember((info.format ?? 1) < current ? rewrite(info) : info)
    },
    require(id) {
      const session = sessions.open(id)
      if (!session) throw new Error(`No thread ${id}`)
      return session
    },
    branch(source, id, at) {
      const title = source.title ? `${source.title} (branch)` : undefined
      const copy = sessions.create({ id, cwd: source.cwd, project: source.project, title, parent: source.id, kind: 'branch' })
      const path = source.path()
      const end = at === undefined ? path.length : path.findIndex(entry => entry.id === at) + 1
      for (const entry of path.slice(0, end)) copy.append(entry.type, entry.data)
      return copy
    },
    list: summaries(db),
    synced: sync.synced,
    children: sync.children,
    entriesOfType: type => ofType.all({ type }).map(parseRow),
    remove(id) {
      const session = sessions.open(id)
      if (!session) return
      for (const removed of removeAll(id)) forget(removed)
      hooks.remove(session)
    },
    format: current,
    upgrade,
  }

  return { sessions, forget }
}
