import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { parkedNote } from '../remove/notes'
import { removeWorktree } from '../remove/remove'
import { threadsIn } from '../sessions/inside'

export const dayMs = 24 * 60 * 60_000

export const tidyWorktree = async (deps: WorktreeDeps, record: WorktreeRecord, now: number) => {
  if (record.removed) return
  const inside = threadsIn(deps.sessions, record.path)
  const archived = inside.flatMap(thread => (thread.archived === null ? [] : [thread.archived]))
  if (archived.length < inside.length) return
  const since = inside.length ? Math.max(...archived) : record.created
  const force = now - since >= deps.keepDays.archived * dayMs
  if (!force && !inside.length) return
  const result = await removeWorktree(deps, { path: record.path, force }, parkedNote)
  if (!result.removed) return
  record.parked = true
  await deps.store.save()
}
