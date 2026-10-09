import { projectOfFolder } from '@sand/host'
import type { Database } from 'bun:sqlite'

export interface Assigned {
  id: string
  project: string
}

const unassignedSql = "select id, cwd from sessions where project is null and cwd is not null and cwd != ''"
const assignSql = 'update sessions set project = $project where id = $id'

export const assignProjects = (db: Database, home: string): Assigned[] => {
  const found = new Map<string, string | null>()
  const projectOf = (cwd: string) => {
    if (!found.has(cwd)) found.set(cwd, projectOfFolder(cwd, home))
    return found.get(cwd)
  }
  const assigned = db
    .query<{ id: string; cwd: string }, []>(unassignedSql)
    .all()
    .flatMap(({ id, cwd }) => {
      const project = projectOf(cwd)
      return project ? [{ id, project }] : []
    })
  const assign = db.query<unknown, { id: string; project: string }>(assignSql)
  db.transaction(() => {
    for (const row of assigned) assign.run(row)
  })()
  return assigned
}
