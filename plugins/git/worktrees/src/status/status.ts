import type { GitRunner } from '@sand/git/contract'
import { arrangePulls, type PullLinks } from '@sand/pull-links/contract'
import { existsSync } from 'node:fs'
import type { WorktreePull, WorktreeStatus } from '../contract'
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

const pullOf = async (deps: WorktreeDeps, links: PullLinks | undefined, sessions: string[]): Promise<WorktreePull | undefined> => {
  if (!links) return undefined
  for (const id of sessions.filter(id => deps.sessions.open(id))) {
    const primary = arrangePulls((await links.links(id)).links).primary
    if (primary?.summary) return { number: primary.number, state: primary.summary.state }
  }
  return undefined
}

const statusOf = async (deps: WorktreeDeps, record: WorktreeRecord, links: PullLinks | undefined): Promise<WorktreeStatus> => {
  const sessions = withSessions(
    record.sessions,
    threadsIn(deps.sessions, record.path).map(session => session.id),
  )
  const exists = existsSync(record.path)
  const [check, branch, ahead, pull] = await Promise.all([
    removeCheck(deps, record),
    exists ? currentBranch(deps.git, record.path) : record.branch,
    exists ? beyondBase(deps.git, record) : undefined,
    pullOf(deps, links, sessions),
  ])
  return {
    path: record.path,
    main: record.main,
    ...(branch ? { branch } : {}),
    ...(record.base ? { base: record.base } : {}),
    sessions,
    created: record.created,
    check,
    ...(ahead === undefined ? {} : { ahead }),
    ...(pull ? { pull } : {}),
  }
}

export const worktreeStatuses = async (deps: WorktreeDeps, links: PullLinks | undefined) =>
  Promise.all((await liveRecords(deps)).map(record => statusOf(deps, record, links)))
