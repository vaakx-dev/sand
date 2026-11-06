import type { WorktreePull, WorktreePulls } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { parkedNote } from '../remove/notes'
import { removeWorktree } from '../remove/remove'
import { threadsIn, withSessions } from '../sessions/inside'

export const dayMs = 24 * 60 * 60_000

const ended = (pull: WorktreePull | undefined) => pull?.state === 'merged' || pull?.state === 'closed'

export const tidyWorktree = async (deps: WorktreeDeps, pulls: WorktreePulls | undefined, record: WorktreeRecord, now: number) => {
  if (record.removed) return
  const inside = threadsIn(deps.sessions, record.path)
  const settled = inside.flatMap(thread => (thread.settled === null ? [] : [thread.settled]))
  if (settled.length < inside.length) return
  const since = inside.length ? Math.max(...settled) : record.created
  const pull = await pulls?.primary(withSessions(record.sessions, inside.map(thread => thread.id)))
  const force = ended(pull) || now - since >= deps.keepDays.settled * dayMs
  if (!force && !inside.length) return
  const result = await removeWorktree(deps, { path: record.path, force }, parkedNote)
  if (!result.removed) return
  record.parked = true
  await deps.store.save()
}
