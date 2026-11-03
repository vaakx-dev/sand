import type { PullLinks } from '@sand/pull-links/contract'
import type { WorktreeDeps } from '../deps'
import { createSizes } from './size'
import { liveRecords, worktreeStatuses } from './status'

export const createSurvey = (deps: WorktreeDeps, links: () => PullLinks | undefined) => {
  const sizes = createSizes()
  return {
    status: () => worktreeStatuses(deps, links()),
    sizes: async () => sizes.count((await liveRecords(deps)).map(record => record.path)),
    known: sizes.known,
  }
}

export type Survey = ReturnType<typeof createSurvey>
