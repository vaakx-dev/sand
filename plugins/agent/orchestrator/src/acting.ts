import type { Actor } from '@sand/host-hub/contract'
import { agentLimits } from '@sand/subagents/contract'
import type { OrchestratorContext } from './context'
import { failure } from './contract'
import { findThread } from './find'
import type { Adopt } from './start'

export const adoptBy = (ctx: OrchestratorContext, actor: Actor | undefined): Adopt | undefined => {
  const limits = ctx.get(agentLimits)
  if (actor?.owner !== 'thread' || !limits) return undefined
  const scope = limits.child(findThread(ctx, actor.id), 'thread')
  return thread => limits.give(thread, scope)
}

export const checkSend = (ctx: OrchestratorContext, actor: Actor | undefined, target: string) => {
  if (actor?.owner !== 'thread') return
  if (ctx.get(agentLimits)?.covers(findThread(ctx, actor.id), findThread(ctx, target)) === false)
    throw failure('denied', `Thread ${target} may use tools you may not, so you can't message it`)
}

export const checkWait = (actor: Actor | undefined, thread: string) => {
  if (actor?.owner === 'bot') throw failure('denied', "Bots can't wait on threads; a thread you started sends its reply as a <task-notification> when it finishes")
  if (actor?.id === thread) throw failure('invalid_request', "A thread can't wait for itself")
}
