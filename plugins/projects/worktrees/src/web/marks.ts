import type { WorktreeMark } from '../contract'
import { gathered, placeCache } from '@sand/kit/web'
import type { WebContext, WorktreeClient } from './client'

export const createMarks = (ctx: WebContext, client: WorktreeClient) => {
  const ask = gathered(ctx, (device, cwds) => client.marks(cwds, device))
  return placeCache<WorktreeMark | null>(ctx, {
    load: async (cwd, device) => (await ask(cwd, device)) ?? null,
    changed: () => ctx.emit('worktrees.change'),
    freshMs: 30_000,
    ready: () => ctx.wire.state() === 'open',
  })
}

export type Marks = ReturnType<typeof createMarks>
