import { helloLimits, type Limits, limitsRefresh, llmLimitsWire } from '@sand/accounts/contract'
import type { Context } from 'drydock'
import { type LimitsFeed, limitsChange, type Wire, wireHello } from '../contract'

const keyOf = (limits: Limits) => `${limits.source}|${limits.pc ?? ''}`

export const createLimits = (ctx: Context, wire: Wire): LimitsFeed => {
  let limits: Limits | undefined
  const known = new Map<string, Limits>()
  const set = (next: Limits | undefined) => {
    if (next) known.set(keyOf(next), next)
    limits = next ?? limits
    ctx.emit(limitsChange)
  }
  ctx.on(wireHello, () => set(wire.hello(helloLimits)))
  ctx.effect(() => wire.on(llmLimitsWire, set))
  return {
    current: () => limits,
    all: () => [...known.values()],
    refresh: async () => set(await wire.call(limitsRefresh, {})),
  }
}
