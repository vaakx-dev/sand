import type { llm, LLMRequest } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { media } from '@sand/media/contract'
import { contextUsage, type CompactionReason, type CompactionRecord } from './contract'
import { usageRecord } from '@sand/usage/contract'
import type { Context } from 'drydock'
import { budgetOf, usageOf, type Budget } from './budget'
import type { CompactionConfig } from './config'
import { plan } from './history/plan'
import { compactedMessages } from './history/summary'
import { requestTokens } from './measure/estimate'
import type { Tracker } from './measure/tracker'
import { filesOf } from './summarize/files'
import { summarize } from './summarize'
import { summarizeInContext } from './summarize/in-context'

export type CompactionContext = Context<{ llm: typeof llm; media: typeof media }>

export interface CompactOptions {
  reason: CompactionReason
  signal?: AbortSignal
}

const draft = (conversation: Conversation, path: Entry[], record: CompactionRecord): Entry => ({
  id: 'draft',
  session: conversation.id,
  parent: path.at(-1)?.id ?? null,
  at: Date.now(),
  type: 'compaction',
  data: record,
  seq: 0,
})

export const createCompactor = (ctx: CompactionContext, config: CompactionConfig, tracker: Tracker) => {
  const running = new Map<string, Promise<number>>()

  const native = (model?: string) => !!model && !!ctx.llm.caps?.(model).native

  const run = async (conversation: Conversation, request: LLMRequest, budget: Budget, { reason, signal }: CompactOptions) => {
    const path = conversation.path()
    const overflow = reason === 'overflow'
    const cut = plan(path, budget.keep) ?? (overflow ? plan(path, 0) : undefined)
    if (!cut) throw new Error('Nothing to compact yet')
    const before = tracker.project(conversation.id, request)
    ctx.emit(contextUsage, conversation, usageOf(budget, before, true))
    let after = before
    try {
      const { summary, usage, source } = overflow || native(request.model)
        ? await summarize(ctx.llm, ctx.media, {
            model: request.model,
            messages: cut.dropped,
            previous: cut.previous?.summary,
            instructions: config.instructions,
            limit: budget.limit,
            signal,
          })
        : await summarizeInContext(ctx.llm, request, config.instructions, signal)
      signal?.throwIfAborted()
      const record: CompactionRecord = {
        summary,
        keep: cut.keep,
        ...(cut.pinned && { pinned: cut.pinned }),
        reason,
        before,
        files: filesOf(cut.dropped, cut.previous?.files),
        ...(request.thread && { thread: request.thread.id }),
      }
      after = requestTokens({ ...request, messages: compactedMessages([...path, draft(conversation, path, record)]) })
      conversation.append('compaction', { ...record, after } satisfies CompactionRecord)
      if (usage) conversation.append('usage', usageRecord(ctx.llm.provider?.(request.model), request.model, usage, source))
      tracker.reset(conversation.id)
      return after
    } finally {
      ctx.emit(contextUsage, conversation, usageOf(budget, after))
    }
  }

  return {
    budget: (request: LLMRequest) => budgetOf(ctx.llm, config, request.model),
    compact(conversation: Conversation, request: LLMRequest, options: CompactOptions) {
      const current = running.get(conversation.id)
      if (current) return current
      const work = run(conversation, request, budgetOf(ctx.llm, config, request.model), options).finally(() => running.delete(conversation.id))
      running.set(conversation.id, work)
      return work
    },
  }
}

export type Compactor = ReturnType<typeof createCompactor>
