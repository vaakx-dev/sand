import type { Database } from 'bun:sqlite'
import { syncLog } from './sync/schema'

const sessions = `create table if not exists sessions (
  id text primary key, created integer not null, cwd text not null, title text, head text, parent text, origin text,
  kind text not null default 'main', named integer not null default 0, pinned integer not null default 0, settled integer,
  seen integer not null default 0, position real, project text, format integer not null default 1, snoozed integer
)`

const entries =
  'create table if not exists entries (id text primary key, session text not null, parent text, at integer not null, type text not null, data text not null)'

export const createSchema = (db: Database) =>
  db.transaction(() => {
    db.run(sessions)
    db.run(entries)
    db.run('create index if not exists entries_session_type_at on entries (session, type, at)')
    syncLog(db)
  })()
