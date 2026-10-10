import type { Limits } from '@sand/llm-accounts/contract'
import type { LimitsFeed, Wire } from '../contract'
import type { Context } from 'drydock'

const keyOf = (limits: Limits) => `${limits.source ?? 'claude'}|${limits.pc ?? ''}`

export const createLimits = (ctx: Context, wire: Wire): LimitsFeed => {
  let limits: Limits | undefined
  const known = new Map<string, Limits>()
  const set = (next: Limits | undefined) => {
    if (next) known.set(keyOf(next), next)
    limits = next ?? limits
    ctx.emit('limits.change')
  }
  ctx.on('wire.hello', hello => set(hello.limits))
  ctx.on('wire.event', event => {
    if (event.name === 'llm.limits') set(event.args[0])
  })
  return {
    current: () => limits,
    all: () => [...known.values()],
    refresh: async () => set(await wire.call<Limits | undefined>({ type: 'limits.refresh' })),
  }
}
