import { type ChatKind, sessionSettle } from '@sand/chats/contract'
import { type ConversationRef, engine } from '@sand/engine/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import type { CompactionContext, Compactor } from './compact'
import type { Tracker } from './measure/tracker'

const beforeExpiry = 0.9
const worthCompacting = 100_000
const shortLived = new Set<ChatKind | undefined>(['agent', 'quick'])

export const idleCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const timers = new Map<string, Timer>()
  const lifetimes = new Map<string, { model?: string; ttl: number }>()

  const cancel = (id: string) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  const compact = async (ref: ConversationRef, turn: string) => {
    timers.delete(ref.id)
    const found = ctx.get(engine)
    if (!found?.turn(ref.owner, turn)?.ended) return
    const conversation = found.open(ref)
    const request = conversation && (await ctx.get(providerThreads)?.view(conversation))
    if (!request || tracker.project(ref.id, request) < worthCompacting) return
    void compactor.start(conversation, request, 'idle')
  }

  const lifetimeOf = (id: string, model: string | undefined, written: number | undefined) => {
    if (written) return written
    const known = lifetimes.get(id)
    return known?.model === model ? known?.ttl : undefined
  }

  ctx.on(stepSettle, (request, { owner, id }, turn, _usage, written) => {
    cancel(id)
    const ttl = lifetimeOf(id, request.model, written)
    if (!ttl || shortLived.has(request.sessionKind)) {
      lifetimes.delete(id)
      return
    }
    lifetimes.set(id, { model: request.model, ttl })
    timers.set(id, setTimeout(() => void compact({ owner, id }, turn.id), ttl * beforeExpiry))
  })
  ctx.on(sessionSettle, session => {
    cancel(session.id)
    lifetimes.delete(session.id)
  })
  ctx.effect(() => () => timers.forEach(clearTimeout))
}
