import type { LLMRequest } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { contextBuild, contextOverflow, loop, turnEnd } from '@sand/loop/contract'
import type { CompactionReason } from './contract'
import type { CompactionContext, Compactor } from './compact'
import { rewrite } from './history/rewrite'
import type { Tracker } from './measure/tracker'
import { isOverflow } from './overflow'

export const autoCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const overflowed = new Set<string>()
  const failed = new Set<string>()

  const attempt = async (session: Session, request: LLMRequest, reason: CompactionReason, signal?: AbortSignal) => {
    try {
      await compactor.compact(session, request, { reason, signal })
      return true
    } catch {
      if (signal?.aborted) return false
      if (reason === 'threshold') failed.add(session.id)
      return false
    }
  }

  const due = (session: Session, request: LLMRequest): CompactionReason | undefined => {
    if (overflowed.delete(session.id)) return 'overflow'
    if (failed.has(session.id)) return undefined
    return tracker.project(session.id, request) >= compactor.budget(request).limit ? 'threshold' : undefined
  }

  ctx.on(
    contextBuild,
    async (request, session, signal) => {
      let current = rewrite(session.path(), request)
      if (!ctx.get(loop)?.active(session)) return current
      const reason = due(session, current)
      if (reason && (await attempt(session, current, reason, signal))) current = rewrite(session.path(), request)
      tracker.sent(session.id, current.messages.length)
      return current
    },
    { priority: -100 },
  )

  ctx.on(contextOverflow, (session, error) => {
    if (!isOverflow(error)) return undefined
    overflowed.add(session.id)
    return true
  })

  ctx.on(turnEnd, session => {
    failed.delete(session.id)
    overflowed.delete(session.id)
  })
}
