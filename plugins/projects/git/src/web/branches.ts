import { gathered, placeCache } from '@sand/dom'
import type { Context } from 'drydock'
import type { Branches } from '../contract'

export const createBranches = (ctx: Context<'wire'>): Branches => {
  const ask = gathered(ctx, (device, cwds) => ctx.wire.call<Record<string, string | null>>({ type: 'git.branches', cwds }, device))
  const cache = placeCache<string>(ctx, {
    load: async (cwd, device) => (await ask(cwd, device)) ?? undefined,
    changed: () => ctx.emit('branches.change'),
    freshMs: 15_000,
    ready: () => ctx.wire.state() === 'open',
  })
  return { of: cache.of }
}
