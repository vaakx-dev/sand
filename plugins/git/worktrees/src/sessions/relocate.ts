import { errorMessage } from '@sand/util'
import { isWithin } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { WorktreeDeps } from '../deps'

export const sameFolderIn = (cwd: string, from: string, to: string) => {
  if (!isWithin(cwd, from)) return to
  const inner = join(to, relative(from, cwd))
  return existsSync(inner) ? inner : to
}

export const relocateAll = (deps: WorktreeDeps, ids: string[], from: string, to: string, note: (cwd: string) => string) => {
  const moved: string[] = []
  const failed: string[] = []
  for (const id of ids) {
    const session = deps.sessions.open(id)
    if (!session) continue
    const cwd = sameFolderIn(session.cwd, from, to)
    try {
      deps.sessions.relocate(id, { cwd, project: session.project, note: note(cwd) })
      moved.push(id)
    } catch (error) {
      failed.push(`${session.title || id}: ${errorMessage(error)}`)
    }
  }
  return { moved, failed }
}
