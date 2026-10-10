import type { Database } from 'bun:sqlite'
import { syncLog } from './sync/schema'

type Step = (db: Database) => void

const sessionColumns: [string, string][] = [
  ['parent', 'text'],
  ['origin', 'text'],
  ['kind', "text not null default 'main'"],
  ['named', 'integer not null default 0'],
  ['pinned', 'integer not null default 0'],
  ['settled', 'integer'],
  ['snoozed', 'integer'],
  ['seen', 'integer not null default 0'],
  ['position', 'real'],
  ['project', 'text'],
  ['format', 'integer not null default 1'],
]

const lastActivity = 'coalesce((select max(at) from entries where entries.session = sessions.id), created)'

const additive: Step = db => {
  db.run(
    'create table if not exists sessions (id text primary key, created integer not null, cwd text not null, title text, head text)',
  )
  db.run(
    'create table if not exists entries (id text primary key, session text not null, parent text, at integer not null, type text not null, data text not null)',
  )
  db.run('create index if not exists entries_session on entries (session)')
  const existing = new Set(db.query<{ name: string }, []>('pragma table_info(sessions)').all().map(column => column.name))
  for (const [name, type] of sessionColumns) if (!existing.has(name)) db.run(`alter table sessions add column ${name} ${type}`)
  if (!existing.has('seen')) db.run(`update sessions set seen = ${lastActivity}`)
  if (!existing.has('position')) db.run(`update sessions set position = ${lastActivity}`)
  if (existing.has('unsettled')) db.run('alter table sessions drop column unsettled')
}

const addSnoozed: Step = additive

const coveringIndex: Step = db => {
  db.run('create index if not exists entries_session_type_at on entries (session, type, at)')
  db.run('drop index if exists entries_session')
}

const steps: Step[] = [additive, addSnoozed, coveringIndex, syncLog]

export const migrate = (db: Database) => {
  const { user_version } = db.query<{ user_version: number }, []>('pragma user_version').get()!
  for (let version = user_version; version < steps.length; version++) {
    db.transaction(() => {
      steps[version]!(db)
      db.run(`pragma user_version = ${version + 1}`)
    })()
  }
}
