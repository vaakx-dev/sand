import { placeCache } from '@sand/kit/web'
import type { Context } from 'drydock'
import type { PrSummary, Pulls } from '../contract'

export const createPulls = (ctx: Context<'wire'>): Pulls => {
  const cache = placeCache<PrSummary | null>(ctx, {
    load: async (cwd, device) => (await ctx.wire.call<PrSummary | null>({ type: 'github.pr', cwd }, device)) ?? null,
    changed: () => ctx.emit('pulls.change'),
    ready: () => ctx.wire.state() === 'open',
  })
  return { of: cache.of, refresh: (cwd, device) => void cache.refresh(cwd, device) }
}
