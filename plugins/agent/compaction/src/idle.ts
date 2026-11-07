import { type ChatKind, sessionSettle } from '@sand/chats/contract'
import { type ConversationRef, engine } from '@sand/engine/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import type { CompactionContext, Compactor } from './compact'
import type { Tracker } from './measure/tracker'

const beforeExpiry = 0.9
const worthCompacting = 50_000
const shortLived = new Set<ChatKind | undefined>(['agent', 'quick'])

export const idleCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const timers = new Map<string, Timer>()

  const cancel = (id: string) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  const cacheTtl = (model?: string) => (model && ctx.llm.caps?.(model).cacheTtlMs) || 0

  const compact = async (ref: ConversationRef, turn: string) => {
    timers.delete(ref.id)
    const found = ctx.get(engine)
    if (!found?.turn(ref.owner, turn)?.ended) return
    const conversation = found.open(ref)
    const request = conversation && (await ctx.get(providerThreads)?.view(conversation))
    if (!request || tracker.project(ref.id, request) < worthCompacting) return
    void compactor.start(conversation, request, 'idle')
  }

  ctx.on(stepSettle, (request, { owner, id }, turn) => {
    cancel(id)
    const ttl = cacheTtl(request.model)
    if (!ttl || shortLived.has(request.sessionKind)) return
    timers.set(id, setTimeout(() => void compact({ owner, id }, turn.id), ttl * beforeExpiry))
  })
  ctx.on(sessionSettle, session => cancel(session.id))
  ctx.effect(() => () => timers.forEach(clearTimeout))
}
