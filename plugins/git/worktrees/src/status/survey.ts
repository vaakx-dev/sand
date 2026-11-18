import { pathKey } from '@sand/git/contract'
import type { WorktreeDeps } from '../deps'
import { type SizeWalk, walkSizes } from './size'
import { liveRecords, worktreeStatuses } from './status'

export const createSurvey = (deps: WorktreeDeps) => {
  const known = new Map<string, number>()
  let walk: SizeWalk | undefined
  let counting: Promise<Record<string, number>> | undefined

  const count = async () => {
    const folders = (await liveRecords(deps)).map(record => record.path)
    if (!folders.length) return {}
    walk = walkSizes(folders, (folder, size) => known.set(pathKey(folder), size))
    return walk.sizes
  }

  return {
    status: () => worktreeStatuses(deps),
    known: (folder: string) => known.get(pathKey(folder)),
    sizes() {
      counting ??= count().finally(() => {
        counting = undefined
        walk = undefined
      })
      return counting
    },
    close: () => walk?.stop(),
  }
}

export type Survey = ReturnType<typeof createSurvey>
