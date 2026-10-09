import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ThreadFolder {
  cwd: string
  created: number
}

const query = "select cwd, min(created) as created from sessions where kind != 'agent' group by cwd"

export const threadFolders = (home: string): ThreadFolder[] => {
  const path = join(home, 'sand.db')
  if (!existsSync(path)) return []
  let db: Database | undefined
  try {
    db = new Database(path, { readonly: true })
    return db.query<ThreadFolder, []>(query).all()
  } catch {
    return []
  } finally {
    db?.close()
  }
}
