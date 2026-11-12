import type { SessionInfo } from '@sand/chats/contract'
import type { WorktreeThreadInput } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { repoAt } from '../repo/local'
import { infoOf } from '../sessions/info'
import { resolveBase } from './base'
import { rolledBack } from './rollback'
import { branchWorktree, createWorktree, discardWorktree } from './worktree'

const newRecord = (deps: WorktreeDeps, main: string, defaultBranch: string | undefined, { branch, from }: WorktreeThreadInput) => {
  if (branch) return branchWorktree(deps, { main, branch, ...(from ? { base: from } : {}) })
  return resolveBase(deps.git, main, defaultBranch, from).then(base => createWorktree(deps, { main, start: base.start, base: base.name }))
}

export const threadIn = async (deps: WorktreeDeps, input: WorktreeThreadInput): Promise<SessionInfo> => {
  const local = await repoAt(deps.repos, input.cwd)
  await deps.store.ready()
  const record = await deps.queue(local.main, () => newRecord(deps, local.main, local.defaultBranch, input))
  const session = await startThread(deps, record, local.main, input)
  record.sessions = [session.id]
  if (record.setup) record.setup.session = session.id
  await deps.setups.start(record)
  deps.proposals.offer(record).catch(deps.report)
  await deps.changed(local.main, record.path)
  return infoOf(session)
}

const startThread = async (deps: WorktreeDeps, record: WorktreeRecord, main: string, { open }: WorktreeThreadInput) => {
  const project = deps.projectOf(main)
  try {
    return open ? open(record.path, project) : deps.sessions.thread(record.path, { project })
  } catch (error) {
    throw await rolledBack(error, () => deps.queue(main, () => discardWorktree(deps, record)))
  }
}

