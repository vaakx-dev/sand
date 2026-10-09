import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { migrate } from './schema'

export const open = (path: string) => {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true, strict: true })
  db.run('pragma journal_mode = wal')
  db.run('pragma busy_timeout = 5000')
  migrate(db)
  return db
}
