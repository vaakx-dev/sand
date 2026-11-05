import type { SessionSummary } from '@sand/chats/contract'
import { samePath } from '@sand/util'
import type { OrchestratorContext } from './context'
import type { ThreadRow } from './contract'
import { threadStatus } from './state'

export interface ListFilter {
  cwd?: string
  project?: string
  limit?: number
}

const defaultLimit = 50

const matches = ({ cwd, project }: ListFilter) => (summary: SessionSummary) =>
  summary.kind === 'thread' && (cwd === undefined || samePath(summary.cwd, cwd)) && (project === undefined || summary.project === project)

export const listThreads = (ctx: OrchestratorContext, filter: ListFilter): ThreadRow[] =>
  ctx.sessions
    .list()
    .filter(matches(filter))
    .sort((a, b) => b.updated - a.updated)
    .slice(0, filter.limit ?? defaultLimit)
    .map(summary => ({
      thread: summary.id,
      title: summary.title,
      cwd: summary.cwd,
      project: summary.project,
      updated: summary.updated,
      status: threadStatus(ctx, ctx.sessions.require(summary.id)),
      settled: summary.settled !== null,
    }))
