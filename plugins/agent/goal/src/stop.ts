import type { TurnResult, UsageRecord } from '@sand/loops/contract'
import type { UserContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import { errorMessage, stopFeedback, usageSource } from '@sand/kit'
import type { Context } from 'drydock'
import { check } from './check'
import { activeGoal, entryType, sameGoal, type Goal } from './goal'

type GoalContext = Context<'llm' | 'context'>

const feedback = (goal: Goal, reason: string) =>
  stopFeedback('goal', `Goal not met yet: ${reason}\nKeep working until this goal is met: ${goal.objective}`)

const judge = async (ctx: GoalContext, session: Session, goal: Goal, signal: AbortSignal) => {
  const request = await ctx.waterfall('context.build', await ctx.context.build(session), session)
  const verdict = await check(ctx.llm, request, goal.objective, signal)
  if (verdict.usage) session.append('usage', { id: Bun.randomUUIDv7(), model: request.model, ...usageSource(ctx.llm, request.model), usage: verdict.usage } satisfies UsageRecord)
  return verdict
}

const pursue = async (ctx: GoalContext, session: Session, signal: AbortSignal): Promise<UserContent[] | undefined> => {
  for (let goal = activeGoal(session.path()); goal; goal = activeGoal(session.path())) {
    const verdict = await judge(ctx, session, goal, signal)
    if (signal.aborted) return undefined
    if (!sameGoal(activeGoal(session.path()), goal)) continue
    if (verdict.met) {
      session.append(entryType, { ...goal, status: 'met', reason: verdict.reason } satisfies Goal)
      ctx.ui?.notify(`Goal met: ${goal.objective}`)
      return undefined
    }
    session.append(entryType, { ...goal, checks: goal.checks + 1, reason: verdict.reason } satisfies Goal)
    return [feedback(goal, verdict.reason)]
  }
  return undefined
}

const working = (ctx: GoalContext, session: Session) => Boolean(ctx.agents?.jobs(session).some(job => job.status === 'running'))

export const checkOnStop = (ctx: GoalContext) => async (session: Session, result: TurnResult, signal: AbortSignal) => {
  if (result.stopReason !== 'end_turn' || !activeGoal(session.path()) || working(ctx, session)) return undefined
  try {
    return await pursue(ctx, session, signal)
  } catch (error) {
    if (!signal.aborted) ctx.ui?.notify(`Goal check failed: ${errorMessage(error)}`, 'error')
    return undefined
  }
}
