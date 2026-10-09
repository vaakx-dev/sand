import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const sessionColumns: [string, string][] = [
  ['parent', 'text'],
  ['origin', 'text'],
  ['kind', "text not null default 'main'"],
  ['named', 'integer not null default 0'],
  ['pinned', 'integer not null default 0'],
  ['settled', 'integer'],
  ['seen', 'integer not null default 0'],
  ['position', 'real'],
  ['project', 'text'],
]

const lastActivity = 'coalesce((select max(at) from entries where entries.session = sessions.id), created)'

const markAllSeen = `update sessions set seen = ${lastActivity}`

const keepRecentOrder = `update sessions set position = ${lastActivity}`

export const open = (path: string) => {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true, strict: true })
  db.run('pragma journal_mode = wal')
  db.run('pragma busy_timeout = 5000')
  db.run(
    'create table if not exists sessions (id text primary key, created integer not null, cwd text not null, title text, head text)',
  )
  db.run(
    'create table if not exists entries (id text primary key, session text not null, parent text, at integer not null, type text not null, data text not null)',
  )
  db.run('create index if not exists entries_session on entries (session)')
  const existing = new Set(db.query<{ name: string }, []>('pragma table_info(sessions)').all().map(column => column.name))
  for (const [name, type] of sessionColumns) if (!existing.has(name)) db.run(`alter table sessions add column ${name} ${type}`)
  if (!existing.has('seen')) db.run(markAllSeen)
  if (!existing.has('position')) db.run(keepRecentOrder)
  if (existing.has('unsettled')) db.run('alter table sessions drop column unsettled')
  return db
}
