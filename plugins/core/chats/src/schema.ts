import type { Database } from 'bun:sqlite'
import { syncLog } from './changes'

const chats = `create table if not exists chats (
  id text primary key,
  created integer not null,
  cwd text not null,
  project text,
  head text,
  kind text not null,
  parent text,
  origin text,
  title text not null default '',
  seen integer not null default 1,
  pinned integer not null default 0,
  settled integer,
  snoozed integer,
  position real
)`

const entries =
  'create table if not exists entries (id text primary key, session text not null, parent text, at integer not null, type text not null, data text not null, size integer)'

const addEntrySize = (db: Database) => {
  const columns = db.query<{ name: string }, []>('pragma table_info(entries)').all()
  if (!columns.some(column => column.name === 'size')) db.run('alter table entries add column size integer')
}

export const createSchema = (db: Database) =>
  db.transaction(() => {
    db.run(chats)
    db.run(entries)
    addEntrySize(db)
    db.run('create index if not exists chats_parent on chats (parent)')
    db.run('create index if not exists entries_session_type_at on entries (session, type, at)')
    syncLog(db)
  }).immediate()
