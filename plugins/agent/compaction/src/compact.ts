import type { llm, LLMRequest } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { media } from '@sand/media/contract'
import { compactionBrief, contextUsage, type CompactionReason, type CompactionRecord } from './contract'
import { usageRecord } from '@sand/usage/contract'
import { untilAborted } from '@sand/util'
import type { Context } from 'drydock'
import type { CompactionConfig } from './config'
import { plan } from './history/plan'
import { compactedMessages } from './history/summary'
import { requestTokens } from './measure/estimate'
import type { Meter } from './measure/meter'
import type { Tracker } from './measure/tracker'
import { filesOf } from './summarize/files'
import { summarize } from './summarize'
import { summarizeInContext } from './summarize/in-context'
import { summaryBrief } from './summarize/prompt'

export type CompactionContext = Context<{ llm: typeof llm; media: typeof media }>

interface Summary {
  record: CompactionRecord
  base?: string
  previous?: string
}

interface Job {
  work: Promise<Summary>
  done?: Summary
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

const latestCompaction = (path: Entry[]) => path.findLast(entry => entry.type === 'compaction')?.id

const fits = ({ record, base, previous }: Summary, path: Entry[], request: LLMRequest) =>
  record.thread === request.thread?.id && latestCompaction(path) === previous && path.some(entry => entry.id === base)

interface Measures {
  config: CompactionConfig
  tracker: Tracker
  meter: Meter
}

export const createCompactor = (ctx: CompactionContext, { config, tracker, meter }: Measures) => {
  const jobs = new Map<string, Job>()
  const { budget, usage } = meter

  const native = (model?: string) => !!model && !!ctx.llm.caps?.(model).native

  const summarizeFrom = async (conversation: Conversation, request: LLMRequest, reason: CompactionReason): Promise<Summary> => {
    const path = conversation.path()
    const overflow = reason === 'overflow'
    const { keep, limit } = budget(request)
    const cut = plan(path, keep) ?? (overflow ? plan(path, 0) : undefined)
    if (!cut) throw new Error('Nothing to compact yet')
    const brief = (await ctx.bail(compactionBrief, conversation)) ?? summaryBrief
    const { summary, usage, source } =
      overflow || native(request.model)
        ? await summarize(ctx.llm, ctx.media, {
            model: request.model,
            brief,
            messages: cut.dropped,
            previous: cut.previous?.summary,
            instructions: config.instructions,
            limit,
          })
        : await summarizeInContext(ctx.llm, brief, request, config.instructions)
    if (usage) conversation.append('usage', usageRecord(ctx.llm.provider?.(request.model), request.model, usage, source))
    const record: CompactionRecord = {
      summary,
      keep: cut.keep,
      ...(cut.pinned && { pinned: cut.pinned }),
      reason,
      files: filesOf(cut.dropped, cut.previous?.files),
      ...(request.thread && { thread: request.thread.id }),
    }
    return { record, base: path.at(-1)?.id, previous: latestCompaction(path) }
  }

  const run = (conversation: Conversation, request: LLMRequest, reason: CompactionReason) => {
    const release = ctx.busy()
    const job: Job = { work: summarizeFrom(conversation, request, reason) }
    jobs.set(conversation.id, job)
    job.work
      .then(
        summary => {
          job.done = summary
        },
        error => {
          if (jobs.get(conversation.id) === job) jobs.delete(conversation.id)
          ctx.report(error)
        },
      )
      .finally(release)
    return job
  }

  const place = (conversation: Conversation, request: LLMRequest, summary: Summary) => {
    const path = conversation.path()
    if (!fits(summary, path, request)) return false
    const before = tracker.project(conversation.id, request)
    const compacted = { ...request, messages: compactedMessages([...path, draft(conversation, path, summary.record)]) }
    const after = requestTokens(compacted)
    conversation.append('compaction', { ...summary.record, before, after } satisfies CompactionRecord)
    tracker.reset(conversation.id)
    ctx.emit(contextUsage, conversation, usage(compacted, after))
    return true
  }

  const take = (conversation: Conversation, request: LLMRequest) => {
    const done = jobs.get(conversation.id)?.done
    if (!done) return false
    jobs.delete(conversation.id)
    return place(conversation, request, done)
  }

  return {
    budget,
    start: (conversation: Conversation, request: LLMRequest, reason: CompactionReason) => (jobs.get(conversation.id) ?? run(conversation, request, reason)).work,
    take,
    async wait(conversation: Conversation, request: LLMRequest, reason: CompactionReason, signal: AbortSignal) {
      if (reason === 'overflow') jobs.delete(conversation.id)
      else if (take(conversation, request)) return true
      const job = jobs.get(conversation.id) ?? run(conversation, request, reason)
      const before = tracker.project(conversation.id, request)
      ctx.emit(contextUsage, conversation, { ...usage(request, before), compacting: true })
      const summary = await untilAborted(job.work, signal).catch(() => undefined)
      if (summary && jobs.get(conversation.id) === job) jobs.delete(conversation.id)
      if (summary && place(conversation, request, summary)) return true
      ctx.emit(contextUsage, conversation, usage(request, before))
      return false
    },
  }
}

export type Compactor = ReturnType<typeof createCompactor>
