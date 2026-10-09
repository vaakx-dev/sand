import type { LLMRequest } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { CompactionReason } from './contract'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'
import type { Compactor } from './compact'
import { rewrite } from './history/rewrite'
import type { Tracker } from './measure/tracker'
import { isOverflow } from './overflow'

interface Pending {
  reason: CompactionReason
  extra?: string
}

const where = (session: Session) => (session.kind === 'agent' && session.title ? ` in "${session.title}"` : '')

export const autoCompact = (ctx: Context<'llm'>, compactor: Compactor, tracker: Tracker) => {
  const pending = new Map<string, Pending>()
  const failed = new Set<string>()

  const attempt = async (session: Session, request: LLMRequest, { reason, extra }: Pending, signal?: AbortSignal) => {
    try {
      await compactor.compact(session, request, { reason, extra, signal })
      return true
    } catch (error) {
      if (signal?.aborted) return false
      if (reason === 'threshold') failed.add(session.id)
      ctx.ui?.notify(`Compaction failed${where(session)}: ${errorMessage(error)}`, 'error')
      return false
    }
  }

  const due = (session: Session, request: LLMRequest): Pending | undefined => {
    const asked = pending.get(session.id)
    pending.delete(session.id)
    if (asked) return asked
    if (failed.has(session.id)) return undefined
    return tracker.project(session.id, request) >= compactor.budget(request).limit ? { reason: 'threshold' } : undefined
  }

  ctx.on(
    'context.build',
    async (request, session, signal) => {
      let current = rewrite(session.path(), request)
      if (!ctx.loop?.active(session)) return current
      const next = due(session, current)
      if (next && (await attempt(session, current, next, signal))) current = rewrite(session.path(), request)
      tracker.sent(session.id, current.messages.length)
      return current
    },
    { priority: -100 },
  )

  ctx.on('context.overflow', (session, error) => {
    if (!isOverflow(error)) return undefined
    pending.set(session.id, { reason: 'overflow' })
    return true
  })

  ctx.on('turn.end', session => {
    failed.delete(session.id)
    if (pending.get(session.id)?.reason === 'overflow') pending.delete(session.id)
  })

  return (session: Session, extra?: string) => void pending.set(session.id, { reason: 'manual', extra })
}
