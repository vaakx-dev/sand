import type { LLMRequest } from '@sand/accounts/contract'
import type { Conversation, TurnInfo } from '@sand/engine/contract'
import { contextOverflow, stepPrepare, stepSettle } from '@sand/provider-threads/contract'
import { tokensOf } from '@sand/usage/contract'
import type { CompactionReason } from './contract'
import type { CompactionContext, Compactor } from './compact'
import type { Tracker } from './measure/tracker'
import { isOverflow } from './overflow'

export const autoCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const overflowed = new Map<string, string>()
  const failed = new Map<string, string>()
  const turns = new Map<string, string>()

  const compact = async (conversation: Conversation, turn: TurnInfo, request: LLMRequest, reason: CompactionReason, signal: AbortSignal) => {
    if (await compactor.wait(conversation, request, reason, signal)) return true
    if (!signal.aborted) failed.set(conversation.id, turn.id)
    return undefined
  }

  const boundary = (conversation: Conversation, turn: TurnInfo) => {
    const crossed = turns.get(conversation.id) !== turn.id
    turns.set(conversation.id, turn.id)
    return crossed
  }

  ctx.on(stepSettle, (request, conversation, turn, usage) => {
    if (failed.get(conversation.id) === turn.id || tokensOf(usage) < compactor.budget(request).start) return
    compactor.start(conversation, request, 'threshold').catch(() => failed.set(conversation.id, turn.id))
  })

  ctx.on(stepPrepare, async (request, conversation, turn, signal) => {
    const crossed = boundary(conversation, turn)
    if (overflowed.get(conversation.id) === turn.id) {
      overflowed.delete(conversation.id)
      return compact(conversation, turn, request, 'overflow', signal)
    }
    if (failed.get(conversation.id) !== turn.id && tracker.project(conversation.id, request) >= compactor.budget(request).limit)
      return compact(conversation, turn, request, 'threshold', signal)
    return (crossed && compactor.take(conversation, request)) || undefined
  })

  ctx.on(contextOverflow, (conversation, turn, error) => {
    if (!isOverflow(error)) return undefined
    overflowed.set(conversation.id, turn.id)
    return true
  })
}
