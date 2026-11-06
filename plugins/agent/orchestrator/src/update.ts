import type { InputOf } from '@sand/host-hub/contract'
import type { OrchestratorContext } from './context'
import type { threadUpdate } from './contract'
import { findThread } from './find'
import { rowOf } from './list'

export const updateThread = async (ctx: OrchestratorContext, { session, title, pinned, snoozed, settled }: InputOf<typeof threadUpdate>) => {
  const { id } = findThread(ctx, session)
  if (title !== undefined) ctx.sessions.rename(id, title)
  if (pinned !== undefined) ctx.sessions.pin(id, pinned)
  if (snoozed !== undefined) ctx.sessions.snooze(id, snoozed)
  if (settled !== undefined) await ctx.sessions.settle(id, settled)
  return rowOf(ctx, ctx.sessions.list().find(summary => summary.id === id)!)
}
