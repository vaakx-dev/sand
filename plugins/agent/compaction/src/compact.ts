import type { CompactionReason, CompactionRecord, Entry, LLMRequest, Session, UsageRecord } from '@sand/protocol'
import { usageSource } from '@sand/kit'
import type { Context } from 'drydock'
import { budgetOf, usageOf, type Budget } from './budget'
import type { CompactionConfig } from './config'
import { plan } from './history/plan'
import { rewrite } from './history/rewrite'
import { requestTokens } from './measure/estimate'
import type { Tracker } from './measure/tracker'
import { filesOf } from './summarize/files'
import { summarize } from './summarize'

export interface CompactOptions {
  reason: CompactionReason
  extra?: string
  signal?: AbortSignal
}

const draft = (session: Session, record: CompactionRecord): Entry => ({
  id: 'draft',
  session: session.id,
  parent: session.head,
  at: Date.now(),
  type: 'compaction',
  data: record,
})

export const createCompactor = (ctx: Context<'llm'>, config: CompactionConfig, tracker: Tracker) => {
  const running = new Map<string, Promise<number>>()

  const run = async (session: Session, request: LLMRequest, budget: Budget, { reason, extra, signal }: CompactOptions) => {
    const path = session.path()
    const cut = plan(path, budget.keep) ?? (reason === 'threshold' ? undefined : plan(path, 0))
    if (!cut) throw new Error('Nothing to compact yet')
    const before = tracker.project(session.id, request)
    ctx.emit('context.usage', session, usageOf(budget, before, true))
    let after = before
    try {
      const instructions = [config.instructions, extra].filter(Boolean).join('\n\n') || undefined
      const { summary, usage } = await summarize(ctx.llm, {
        model: request.model,
        messages: cut.dropped,
        previous: cut.previous?.summary,
        instructions,
        limit: budget.limit,
        signal,
      })
      signal?.throwIfAborted()
      const record: CompactionRecord = {
        summary,
        keep: cut.keep,
        ...(cut.pinned && { pinned: cut.pinned }),
        reason,
        before,
        files: filesOf(cut.dropped, cut.previous?.files),
      }
      after = requestTokens(rewrite([...path, draft(session, record)], request))
      session.append('compaction', { ...record, after } satisfies CompactionRecord)
      if (usage) session.append('usage', { id: Bun.randomUUIDv7(), model: request.model, ...usageSource(ctx.llm, request.model), usage } satisfies UsageRecord)
      tracker.reset(session.id)
      return after
    } finally {
      ctx.emit('context.usage', session, usageOf(budget, after))
    }
  }

  return {
    budget: (request: LLMRequest) => budgetOf(ctx.llm, config, request.model),
    compact(session: Session, request: LLMRequest, options: CompactOptions) {
      const current = running.get(session.id)
      if (current) return current
      const work = run(session, request, budgetOf(ctx.llm, config, request.model), options).finally(() => running.delete(session.id))
      running.set(session.id, work)
      return work
    },
  }
}

export type Compactor = ReturnType<typeof createCompactor>
