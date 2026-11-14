import type { Actor } from '@sand/host-hub/contract'
import type { OrchestratorContext } from './context'
import { agentLimits, failure } from './contract'
import { findThread } from './find'
import type { Adopt } from './start'

export const adoptBy = (ctx: OrchestratorContext, actor: Actor | undefined): Adopt | undefined => {
  const limits = ctx.get(agentLimits)
  if (!actor || !limits) return undefined
  const scope = limits.child(ctx.sessions.require(actor.id), 'thread')
  return thread => limits.give(thread, scope)
}

export const checkSend = (ctx: OrchestratorContext, actor: Actor | undefined, target: string) => {
  if (!actor) return
  if (ctx.get(agentLimits)?.covers(ctx.sessions.require(actor.id), findThread(ctx, target)) === false)
    throw failure('denied', `Thread ${target} may use tools you may not, so you can't message it`)
}

export const checkWait = (actor: Actor | undefined, thread: string) => {
  if (actor?.id === thread) throw failure('invalid_request', "A thread can't wait for itself")
}
