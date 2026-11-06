import type { LLMRequest } from '@sand/accounts/contract'
import type { Conversation, TurnInfo } from '@sand/engine/contract'
import { contextOverflow, stepPrepare } from '@sand/provider-threads/contract'
import type { CompactionReason } from './contract'
import type { CompactionContext, Compactor } from './compact'
import type { Tracker } from './measure/tracker'
import { isOverflow } from './overflow'

export const autoCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const overflowed = new Map<string, string>()
  const failed = new Map<string, string>()

  const attempt = async (conversation: Conversation, turn: TurnInfo, request: LLMRequest, reason: CompactionReason, signal: AbortSignal) => {
    try {
      await compactor.compact(conversation, request, { reason, signal })
      return true
    } catch {
      if (signal.aborted) return false
      if (reason === 'threshold') failed.set(conversation.id, turn.id)
      return false
    }
  }

  const due = (conversation: Conversation, turn: TurnInfo, request: LLMRequest): CompactionReason | undefined => {
    if (overflowed.get(conversation.id) === turn.id) {
      overflowed.delete(conversation.id)
      return 'overflow'
    }
    if (failed.get(conversation.id) === turn.id) return undefined
    return tracker.project(conversation.id, request) >= compactor.budget(request).limit ? 'threshold' : undefined
  }

  ctx.on(stepPrepare, async (request, conversation, turn, signal) => {
    const reason = due(conversation, turn, request)
    if (reason && (await attempt(conversation, turn, request, reason, signal))) return true
    tracker.sent(conversation.id, request)
    return undefined
  })

  ctx.on(contextOverflow, (conversation, turn, error) => {
    if (!isOverflow(error)) return undefined
    overflowed.set(conversation.id, turn.id)
    return true
  })
}
