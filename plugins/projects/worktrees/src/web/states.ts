import type { WorktreeState } from '../contract'
import { placeCache } from '@sand/kit/web'
import { sig } from '@vaakx-dev/vrui'
import type { WebContext, WorktreeClient } from './client'

export const createStates = (ctx: WebContext, client: WorktreeClient) => {
  const version = sig(0)
  const cache = placeCache<WorktreeState | null>(ctx, {
    load: (cwd, device) => client.list(cwd, device || undefined),
    changed: () => version.update(value => value + 1),
    freshMs: 15_000,
  })
  return { version, ...cache }
}

export type States = ReturnType<typeof createStates>
