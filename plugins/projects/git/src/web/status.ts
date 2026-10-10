import { placeCache } from '@sand/dom'
import type { Context } from 'drydock'
import type { GitStatus, GitStatuses } from '../contract'

export const createGitStatus = (ctx: Context<'wire'>): GitStatuses => {
  const cache = placeCache<GitStatus>(ctx, {
    load: async (cwd, device) => (await ctx.wire.call<GitStatus | null>({ type: 'git.status', cwd }, device)) ?? undefined,
    changed: () => ctx.emit('gitStatus.change'),
    freshMs: 15_000,
    ready: () => ctx.wire.state() === 'open',
  })
  return {
    of: cache.of,
    refresh: (cwd, device) => void cache.refresh(cwd, device),
  }
}
