import type { SessionInfo } from '@sand/chats/contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { repoAt } from '../repo/local'
import { infoOf } from '../sessions/info'
import { withSessions } from '../sessions/inside'
import { resolveBase } from './base'
import { rolledBack } from './rollback'
import { createWorktree, discardWorktree } from './worktree'

export interface ThreadRequest {
  cwd: string
  from?: string | undefined
  existing?: string | undefined
}

const threadInExisting = async (deps: WorktreeDeps, path: string): Promise<SessionInfo> => {
  const local = await repoAt(deps.repos, path)
  await deps.store.ready()
  const session = deps.sessions.thread(path, { project: deps.projectOf(local.main) })
  const record = deps.store.containing(path)
  if (record) {
    record.sessions = withSessions(record.sessions, [session.id])
    await deps.store.save()
    await deps.changed(record.main)
  }
  return infoOf(session)
}

const threadInNew = async (deps: WorktreeDeps, cwd: string, from?: string): Promise<SessionInfo> => {
  const local = await repoAt(deps.repos, cwd)
  await deps.store.ready()
  const record = await deps.queue(local.main, async () => {
    const base = await resolveBase(deps.git, local.main, local.defaultBranch, from)
    return createWorktree(deps, { main: local.main, start: base.start, base: base.name, steps: base.steps })
  })
  const session = await startThread(deps, record, local.main)
  record.sessions = [session.id]
  if (record.setup) record.setup.session = session.id
  await deps.setups.start(record)
  await deps.changed(local.main, record.path)
  return infoOf(session)
}

const startThread = async (deps: WorktreeDeps, record: WorktreeRecord, main: string) => {
  try {
    return deps.sessions.thread(record.path, { project: deps.projectOf(main) })
  } catch (error) {
    throw await rolledBack(error, () => deps.queue(main, () => discardWorktree(deps, record)))
  }
}

export const threadIn = (deps: WorktreeDeps, { cwd, from, existing }: ThreadRequest) =>
  existing ? threadInExisting(deps, existing) : threadInNew(deps, cwd, from)
