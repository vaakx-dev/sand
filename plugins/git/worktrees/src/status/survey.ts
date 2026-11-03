import { pathKey } from '@sand/git/contract'
import type { WorktreePulls } from '../contract'
import type { WorktreeDeps } from '../deps'
import { sizeOf } from './size'
import { liveRecords, worktreeStatuses } from './status'

export const createSurvey = (deps: WorktreeDeps, pulls: () => WorktreePulls | undefined) => {
  const known = new Map<string, number>()
  const counting = new Map<string, Promise<number>>()

  const count = (folder: string) => {
    const key = pathKey(folder)
    const pending = counting.get(key)
    if (pending) return pending
    const next = sizeOf(folder)
      .then(size => {
        known.set(key, size)
        return size
      })
      .finally(() => counting.delete(key))
    counting.set(key, next)
    return next
  }

  return {
    status: () => worktreeStatuses(deps, pulls()),
    known: (folder: string) => known.get(pathKey(folder)),
    async sizes() {
      const sizes: Record<string, number> = {}
      for (const record of await liveRecords(deps)) sizes[record.path] = await count(record.path)
      return sizes
    },
  }
}

export type Survey = ReturnType<typeof createSurvey>
