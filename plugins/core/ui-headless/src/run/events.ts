import type { Context } from 'drydock'
import type { Follower } from '../follow/follower'

export const followLocal = (ctx: Context, follower: Follower) => {
  ctx.on('llm.event', (event, session) => follower.llmEvent(event, session.id))
  ctx.on('tool.start', (call, session) => follower.toolStart(call, session.id))
  ctx.on('tool.result', (result, _call, session) => void follower.toolResult(result, session.id))
  ctx.on('artifact.saved', (session, artifact) => follower.artifact(session.id, artifact))
  ctx.on('context.usage', (session, usage) => follower.context(session.id, usage))
  ctx.on('llm.limits', limits => follower.limits(limits))
  ctx.on('turn.start', session => follower.turnStart(session.id))
  ctx.on('turn.continue', (session, content) => follower.turnContinue(session.id, content))
  ctx.on('turn.end', (session, result) => follower.turnEnd(session.id, result))
  ctx.on('agent.start', session => follower.agentStart(session))
  ctx.on('agent.end', (session, result) => follower.agentEnd(session, result))
  ctx.on('job.start', job => follower.jobStart(job))
  ctx.on('job.end', job => follower.jobEnd(job))
}
