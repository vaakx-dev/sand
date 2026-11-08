import type { GitRunner } from '@sand/git-runner/contract'
import { existsSync } from 'node:fs'
import type { WorktreeStatus } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { removeCheck } from '../remove/check'
import { currentBranch } from '../repo/refs'

export const liveRecords = async (deps: WorktreeDeps) => {
  await deps.store.ready()
  return deps.store.all().filter(record => !record.removed)
}

const beyondBase = async (git: GitRunner, { path, base }: WorktreeRecord) => {
  if (!base || base === 'HEAD') return undefined
  const count = await git.maybe(path, ['rev-list', '--count', 'HEAD', '--not', base, '--'], { read: true })
  return count === undefined ? undefined : Number(count)
}

const statusOf = async (deps: WorktreeDeps, record: WorktreeRecord): Promise<WorktreeStatus> => {
  const exists = existsSync(record.path)
  const [check, branch, ahead] = await Promise.all([
    removeCheck(deps, record),
    exists ? currentBranch(deps.git, record.path) : record.branch,
    exists ? beyondBase(deps.git, record) : undefined,
  ])
  return {
    path: record.path,
    main: record.main,
    ...(branch ? { branch } : {}),
    ...(record.base ? { base: record.base } : {}),
    check,
    ...(ahead === undefined ? {} : { ahead }),
  }
}

export const worktreeStatuses = async (deps: WorktreeDeps) => Promise.all((await liveRecords(deps)).map(record => statusOf(deps, record)))
