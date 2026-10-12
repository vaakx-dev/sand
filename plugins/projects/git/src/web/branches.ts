import { gathered, placeCache } from '@sand/kit/web'
import type { Context } from 'drydock'

export const createBranches = (ctx: Context<'wire'>) => {
  const ask = gathered(ctx, (device, cwds) => ctx.wire.call<Record<string, string | null>>({ type: 'git.branches', cwds }, device))
  return placeCache<string>(ctx, {
    load: async (cwd, device) => (await ask(cwd, device)) ?? undefined,
    changed: () => ctx.emit('branches.change'),
    freshMs: 15_000,
    ready: () => ctx.wire.state() === 'open',
  })
}
