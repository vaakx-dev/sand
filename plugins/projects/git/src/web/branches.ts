import { gathered, placeCache } from '@sand/dom'
import type { Context } from 'drydock'
import type { Branches } from '../contract'
import { askBranches } from './ask'

export const createBranches = (ctx: Context<'wire'>): Branches => {
  const ask = gathered((device, cwds) => askBranches(ctx.wire, device, cwds))
  const cache = placeCache<string>({
    load: async (cwd, device) => (await ask(cwd, device)) ?? undefined,
    changed: () => ctx.emit('branches.change'),
    freshMs: 15_000,
    ready: () => ctx.wire.state() === 'open',
  })
  return { of: cache.of }
}
