import type { Limits } from '@sand/llm-accounts/contract'
import type { LimitsFeed, Wire } from '../contract'
import type { Context } from 'drydock'

export const createLimits = (ctx: Context, wire: Wire): LimitsFeed => {
  let limits: Limits | undefined
  const set = (next: Limits | undefined) => {
    limits = next ?? limits
    ctx.emit('limits.change')
  }
  ctx.on('wire.hello', hello => set(hello.limits))
  ctx.on('wire.event', event => {
    if (event.name === 'llm.limits') set(event.args[0])
  })
  return {
    current: () => limits,
    refresh: async () => set(await wire.call<Limits | undefined>({ type: 'limits.refresh' })),
  }
}
