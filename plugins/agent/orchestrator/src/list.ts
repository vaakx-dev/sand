import type { SessionSummary } from '@sand/chats/contract'
import { samePath } from '@sand/util'
import type { OrchestratorContext } from './context'
import type { ThreadRow } from './contract'
import { threadStatus } from './state'

export interface ListFilter {
  cwd?: string
  project?: string
  ids?: ReadonlySet<string>
  limit?: number
}

const defaultLimit = 50

export const newestFirst = (rows: ThreadRow[], limit = defaultLimit) => rows.sort((a, b) => b.updated - a.updated).slice(0, limit)

const matches = ({ cwd, project, ids }: ListFilter) => (summary: SessionSummary) =>
  (summary.kind === 'thread' || (summary.kind === 'agent' && ids !== undefined)) &&
  (cwd === undefined || samePath(summary.cwd, cwd)) &&
  (project === undefined || summary.project === project) &&
  (ids === undefined || ids.has(summary.id))

export const rowOf = (ctx: OrchestratorContext, summary: SessionSummary): ThreadRow => ({
  thread: summary.id,
  title: summary.title,
  cwd: summary.cwd,
  project: summary.project,
  updated: summary.updated,
  status: threadStatus(ctx, ctx.sessions.require(summary.id)),
  pinned: summary.pinned,
  settled: summary.settled !== null,
  ...(summary.snoozed !== null && { snoozed: summary.snoozed }),
})

export const listThreads = (ctx: OrchestratorContext, filter: ListFilter): ThreadRow[] =>
  ctx.sessions
    .list()
    .filter(matches(filter))
    .sort((a, b) => b.updated - a.updated)
    .slice(0, filter.limit ?? defaultLimit)
    .map(summary => rowOf(ctx, summary))
