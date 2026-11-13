import { type ConversationRef, engine, turnClose, turnOpen } from '@sand/engine/contract'
import { providerThreads } from '@sand/provider-threads/contract'
import type { CompactionContext, Compactor } from './compact'
import type { Compacted } from './contract'

export const manualCompact = (ctx: CompactionContext, compactor: Compactor) => {
  const running = new Set<string>()
  ctx.on(turnOpen, conversation => void running.add(conversation.id))
  ctx.on(turnClose, conversation => void running.delete(conversation.id))

  return async (ref: ConversationRef): Promise<Compacted> => {
    const conversation = ctx.get(engine)?.open(ref)
    if (!conversation) throw new Error(`No ${ref.owner} ${ref.id} here`)
    if (running.has(ref.id)) throw new Error("It's in the middle of a turn. Compact it once the turn ends.")
    const request = await ctx.get(providerThreads)?.view(conversation)
    if (!request) throw new Error('Nothing to compact yet')
    const { before, after } = await compactor.now(conversation, request)
    return { before, after }
  }
}
