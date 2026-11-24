import type { LLMRequest } from '@sand/accounts/contract'
import { type ChatKind, sessionArchive } from '@sand/chats/contract'
import { type ConversationRef, engine } from '@sand/engine/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import type { CompactionContext, Compactor } from './compact'
import type { IdleShares } from './contract'
import type { Tracker } from './measure/tracker'

const CACHE_MARGIN_MS = 30_000

interface Cached {
  model?: string
  ttlMs: number
  sentAt: number
}

export const idleCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker, shares: () => IdleShares) => {
  const timers = new Map<string, Timer>()
  const caches = new Map<string, Cached>()

  const cancel = (id: string) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  const forget = (id: string) => {
    cancel(id)
    caches.delete(id)
  }

  const shareOf = (kind: ChatKind | undefined) => (kind === 'bot' || kind === 'thread' ? shares()[kind] : undefined)

  const worthCompacting = (id: string, request: LLMRequest) => {
    const share = shareOf(request.sessionKind)
    const limit = compactor.budget(request).bounds?.limit
    return !!share && !!limit && tracker.project(id, request) >= limit * share
  }

  const compact = async (ref: ConversationRef) => {
    timers.delete(ref.id)
    const conversation = ctx.get(engine)?.open(ref)
    const request = conversation && (await ctx.get(providerThreads)?.view(conversation))
    if (!request || !worthCompacting(ref.id, request)) return
    void compactor.start(conversation, request, 'idle')
  }

  const lifetimeOf = (id: string, model: string | undefined, written: number | undefined) => {
    if (written) return written
    const known = caches.get(id)
    if (known && known.model === model) return known.ttlMs
    return model ? ctx.llm.caps?.(model).cacheTtlMs : undefined
  }

  const expiryDelayMs = ({ sentAt, ttlMs }: Cached) => Math.max(0, sentAt + ttlMs - CACHE_MARGIN_MS - Date.now())

  ctx.on(stepSettle, (request, { id }, _turn, { cacheTtlMs, sentAt }) => {
    cancel(id)
    const ttlMs = lifetimeOf(id, request.model, cacheTtlMs)
    if (!ttlMs || !shareOf(request.sessionKind)) return void caches.delete(id)
    caches.set(id, { model: request.model, ttlMs, sentAt })
  })
  ctx.on(turnEnd, ({ id, owner }) => {
    const cached = caches.get(id)
    if (cached) timers.set(id, setTimeout(() => void compact({ owner, id }), expiryDelayMs(cached)))
  })
  ctx.on(sessionArchive, session => forget(session.id))
  ctx.effect(() => () => timers.forEach(clearTimeout))
}
