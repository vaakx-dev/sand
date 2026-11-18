import type { SessionSummary } from '@sand/chats/contract'
import { existsSync } from 'node:fs'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { parkedNote } from '../remove/notes'
import { removeWorktree } from '../remove/remove'
import { threadsIn } from '../sessions/inside'

export const dayMs = 24 * 60 * 60_000

const finishedAt = (deps: WorktreeDeps, chat: SessionSummary) => {
  if (chat.archived !== null) return chat.archived
  return chat.kind === 'agent' && !deps.busy(chat.id) ? chat.updated : undefined
}

const park = async (deps: WorktreeDeps, record: WorktreeRecord, force: boolean) => {
  const result = await removeWorktree(deps, { path: record.path, force }, parkedNote)
  if (!result.removed) return
  record.parked = true
  await deps.store.save()
}

export const tidyWorktree = async (deps: WorktreeDeps, record: WorktreeRecord, now: number) => {
  if (record.removed) return
  if (!existsSync(record.path)) return park(deps, record, true)
  const inside = threadsIn(deps.sessions, record.path)
  const finished = inside.flatMap(chat => finishedAt(deps, chat) ?? [])
  if (finished.length < inside.length) return
  const since = Math.max(record.created, ...finished)
  const due = now - since >= deps.keepDays.archived * dayMs
  const archived = inside.every(chat => chat.archived !== null)
  if (!due && !(archived && inside.length)) return
  await park(deps, record, due && archived)
}
