import type { WorktreeState } from '../contract'
import { placeCache, sig } from '@sand/dom'
import type { WorktreeClient } from './client'

export const createStates = (client: WorktreeClient) => {
  const version = sig(0)
  const cache = placeCache<WorktreeState | null>({
    load: (cwd, device) => client.list(cwd, device || undefined),
    changed: () => version.update(value => value + 1),
    freshMs: 15_000,
  })
  return { version, ...cache }
}

export type States = ReturnType<typeof createStates>
