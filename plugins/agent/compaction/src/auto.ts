import type { LLMRequest } from '@sand/accounts/contract'
import type { Conversation, StepDone, TurnInfo } from '@sand/engine/contract'
import { contextOverflow, stepPrepare, stepSettle } from '@sand/provider-threads/contract'
import type { CompactionReason } from './contract'
import type { CompactionContext, Compactor } from './compact'
import { contextUsed, type Tracker } from './measure/tracker'
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

  const bounds = (request: LLMRequest) => compactor.budget(request).bounds
  const pastStart = (request: LLMRequest, done: StepDone) => contextUsed(done) >= (bounds(request)?.start ?? Infinity)
  const pastLimit = (conversation: Conversation, request: LLMRequest) => tracker.project(conversation.id, request) >= (bounds(request)?.limit ?? Infinity)

  ctx.on(stepSettle, (request, conversation, turn, done) => {
    if (failed.get(conversation.id) === turn.id || !pastStart(request, done)) return
    compactor.start(conversation, request, 'threshold').catch(() => failed.set(conversation.id, turn.id))
  })

  ctx.on(stepPrepare, async (request, conversation, turn, signal) => {
    const crossed = boundary(conversation, turn)
    if (overflowed.get(conversation.id) === turn.id) {
      overflowed.delete(conversation.id)
      return compact(conversation, turn, request, 'overflow', signal)
    }
    if (failed.get(conversation.id) !== turn.id && pastLimit(conversation, request))
      return compact(conversation, turn, request, 'threshold', signal)
    if (crossed && compactor.requested(conversation)) return compact(conversation, turn, request, 'manual', signal)
    return (crossed && compactor.take(conversation, request)) || undefined
  })

  ctx.on(contextOverflow, (conversation, turn, error) => {
    if (!isOverflow(error)) return undefined
    overflowed.set(conversation.id, turn.id)
    return true
  })
}
