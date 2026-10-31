import type { SessionInfo } from '@sand/chats/contract'
import type { WorktreeThreadInput } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { repoAt } from '../repo/local'
import { infoOf } from '../sessions/info'
import { withSessions } from '../sessions/inside'
import { resolveBase } from './base'
import { rolledBack } from './rollback'
import { branchWorktree, createWorktree, discardWorktree } from './worktree'

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

const newRecord = (deps: WorktreeDeps, main: string, defaultBranch: string | undefined, { branch, from }: WorktreeThreadInput) => {
  if (branch) return branchWorktree(deps, { main, branch, ...(from ? { base: from } : {}) })
  return resolveBase(deps.git, main, defaultBranch, from).then(base => createWorktree(deps, { main, start: base.start, base: base.name }))
}

const threadInNew = async (deps: WorktreeDeps, input: WorktreeThreadInput): Promise<SessionInfo> => {
  const local = await repoAt(deps.repos, input.cwd)
  await deps.store.ready()
  const record = await deps.queue(local.main, () => newRecord(deps, local.main, local.defaultBranch, input))
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

export const threadIn = (deps: WorktreeDeps, input: WorktreeThreadInput) => (input.existing ? threadInExisting(deps, input.existing) : threadInNew(deps, input))
