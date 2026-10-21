import { llmEvent, llmLimits } from '@sand/accounts/contract'
import { contextUsage } from '@sand/compaction/contract'
import { artifactSaved } from '@sand/html/contract'
import { toolResult, toolStart, turnEnd, turnStart } from '@sand/loop/contract'
import type { Context } from 'drydock'
import type { Follower } from '../follow/follower'

export const followLocal = (ctx: Context, follower: Follower) => {
  ctx.on(llmEvent, (event, session) => follower.llmEvent(event, session.id))
  ctx.on(toolStart, (call, session) => follower.toolStart(call, session.id))
  ctx.on(toolResult, (result, _call, session) => void follower.toolResult(result, session.id))
  ctx.on(artifactSaved, (session, artifact) => follower.artifact(session.id, artifact))
  ctx.on(contextUsage, (session, usage) => follower.context(session.id, usage))
  ctx.on(llmLimits, limits => follower.limits(limits))
  ctx.on(turnStart, session => follower.turnStart(session.id))
  ctx.on(turnEnd, (session, result) => follower.turnEnd(session.id, result))
}
