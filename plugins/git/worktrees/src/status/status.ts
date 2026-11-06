import type { GitRunner } from '@sand/git-runner/contract'
import { existsSync } from 'node:fs'
import type { WorktreePulls, WorktreeStatus } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { removeCheck } from '../remove/check'
import { currentBranch } from '../repo/refs'
import { threadsIn, withSessions } from '../sessions/inside'

export const liveRecords = async (deps: WorktreeDeps) => {
  await deps.store.ready()
  return deps.store.all().filter(record => !record.removed)
}

const beyondBase = async (git: GitRunner, { path, base }: WorktreeRecord) => {
  if (!base || base === 'HEAD') return undefined
  const count = await git.maybe(path, ['rev-list', '--count', 'HEAD', '--not', base, '--'], { read: true })
  return count === undefined ? undefined : Number(count)
}

const statusOf = async (deps: WorktreeDeps, record: WorktreeRecord, pulls: WorktreePulls | undefined): Promise<WorktreeStatus> => {
  const sessions = withSessions(
    record.sessions,
    threadsIn(deps.sessions, record.path).map(session => session.id),
  )
  const exists = existsSync(record.path)
  const [check, branch, ahead, pull] = await Promise.all([
    removeCheck(deps, record),
    exists ? currentBranch(deps.git, record.path) : record.branch,
    exists ? beyondBase(deps.git, record) : undefined,
    pulls?.primary(sessions),
  ])
  return {
    path: record.path,
    main: record.main,
    ...(branch ? { branch } : {}),
    ...(record.base ? { base: record.base } : {}),
    check,
    ...(ahead === undefined ? {} : { ahead }),
    ...(pull ? { pull } : {}),
  }
}

export const worktreeStatuses = async (deps: WorktreeDeps, pulls: WorktreePulls | undefined) =>
  Promise.all((await liveRecords(deps)).map(record => statusOf(deps, record, pulls)))
