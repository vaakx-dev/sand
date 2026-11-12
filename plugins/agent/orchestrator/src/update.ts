import type { InputOf } from '@sand/host-hub/contract'
import { worktrees } from '@sand/worktrees/contract'
import type { OrchestratorContext } from './context'
import { failure, type threadUpdate } from './contract'
import { findThread } from './find'
import { rowOf } from './list'
import { matchSettings } from './settings'

const moveToWorktree = (ctx: OrchestratorContext, id: string, branch: string | undefined) => {
  const found = ctx.get(worktrees)
  if (!found) throw failure('invalid_request', 'Worktrees are turned off')
  return found.move(id, branch)
}

export const updateThread = async (ctx: OrchestratorContext, { session, title, pinned, snoozed, settled, worktree, branch, ...asked }: InputOf<typeof threadUpdate>) => {
  const thread = findThread(ctx, session)
  const { id } = thread
  ctx.modelSettings.change(thread, matchSettings(ctx, asked))
  if (title !== undefined) ctx.sessions.rename(id, title)
  if (pinned !== undefined) ctx.sessions.pin(id, pinned)
  if (snoozed !== undefined) ctx.sessions.snooze(id, snoozed)
  if (settled !== undefined) await ctx.sessions.settle(id, settled)
  if (worktree || branch) await moveToWorktree(ctx, id, branch)
  return rowOf(ctx, ctx.sessions.list().find(summary => summary.id === id)!)
}
