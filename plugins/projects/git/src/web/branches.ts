import { gathered, placeCache } from '@sand/dom'
import type { Context } from 'drydock'
import type { Branches } from '../contract'

type Wire = Context<'wire'>['wire']
type Found = Record<string, string | null | undefined>

const askEach = async (wire: Wire, device: string, cwds: string[]): Promise<Found> =>
  Object.fromEntries(await Promise.all(cwds.map(async cwd => [cwd, (await wire.call<string | null | undefined>({ type: 'git.branch', cwd }, device)) ?? null])))

const askAll = async (wire: Wire, device: string, cwds: string[]): Promise<Found> => {
  try {
    return await wire.call<Found>({ type: 'git.branches', cwds }, device)
  } catch (error) {
    if (!device) throw error
    return askEach(wire, device, cwds)
  }
}

export const createBranches = (ctx: Context<'wire'>): Branches => {
  const ask = gathered((device, cwds) => askAll(ctx.wire, device, cwds))
  const cache = placeCache<string>({
    load: async (cwd, device) => (await ask(cwd, device)) ?? undefined,
    changed: () => ctx.emit('branches.change'),
    freshMs: 15_000,
    ready: () => ctx.wire.state() === 'open',
  })
  return { of: cache.of }
}
