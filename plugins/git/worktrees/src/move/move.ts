import type { Relocation, SessionInfo } from '@sand/chats/contract'
import type { GitRepoLocal } from '@sand/git/contract'
import { errorMessage, shortSha } from '@sand/util'
import { rolledBack } from '../create/rollback'
import { createWorktree, discardWorktree } from '../create/worktree'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { repoAt } from '../repo/local'
import { checkedNewBranch, headCommit } from '../repo/refs'
import { infoOf } from '../sessions/info'
import { sameFolderIn } from '../sessions/relocate'
import { applyStash, type Carried, dropStash, restoreStash, stashChanges } from './carry'
import { moveNote } from './note'

export interface MoveRequest {
  session: string
  branch?: string | undefined
  carry: boolean
}

interface Moved {
  record: WorktreeRecord
  carried?: Carried
}

const stopFirst = 'Stop the thread first'

const carryInto = async (deps: WorktreeDeps, local: GitRepoLocal, record: WorktreeRecord, carried: Carried) => {
  const failed = await applyStash(deps.git, record.path, carried)
  if (failed) {
    const restored = await rolledBack(failed, () => restoreStash(deps.git, local.root, carried))
    const undone = await rolledBack(restored, () => discardWorktree(deps, record))
    throw new Error(`Couldn't carry your uncommitted changes, so nothing moved. ${errorMessage(undone)}`)
  }
  await dropStash(deps.git, local.root, carried).catch(deps.report)
}

const makeWorktree = async (deps: WorktreeDeps, local: GitRepoLocal, request: MoveRequest): Promise<Moved> => {
  if (deps.busy(request.session)) throw new Error(stopFirst)
  const head = await headCommit(deps.git, local.root)
  if (!head) throw new Error('Make a first commit before moving this thread to a worktree.')
  const branch = request.branch === undefined ? undefined : await checkedNewBranch(deps.git, local.root, request.branch)
  const carried = request.carry ? await stashChanges(deps.git, local.root) : undefined
  const base = local.branch ?? shortSha(head)
  let record: WorktreeRecord
  try {
    record = await createWorktree(deps, { main: local.main, start: head, base, ...(branch ? { branch } : {}), steps: [] })
  } catch (error) {
    throw carried ? await rolledBack(error, () => restoreStash(deps.git, local.root, carried)) : error
  }
  if (carried) await carryInto(deps, local, record, carried)
  return { record, ...(carried ? { carried } : {}) }
}

export const moveThread = async (deps: WorktreeDeps, request: MoveRequest): Promise<SessionInfo> => {
  const session = deps.sessions.require(request.session)
  if (deps.busy(session.id)) throw new Error(stopFirst)
  const local = await repoAt(deps.repos, session.cwd)
  await deps.store.ready()
  const { record, carried } = await deps.queue(local.main, () => makeWorktree(deps, local, request))
  const cwd = sameFolderIn(session.cwd, local.root, record.path)
  const note = moveNote({ from: session.cwd, cwd, record, carried: carried?.files ?? 0, carry: request.carry })
  const stuck = relocateInto(deps, session.id, { cwd, project: session.project, note })
  if (!stuck) {
    record.sessions = [session.id]
    if (record.setup) record.setup.session = session.id
  }
  await deps.setups.start(record)
  await deps.changed(local.main, local.root, record.path)
  if (stuck) throw new Error(`The worktree is ready at ${record.path}${carried ? ' with your changes' : ''}, but the thread couldn't move there: ${stuck}`)
  return infoOf(deps.sessions.require(session.id))
}

const relocateInto = (deps: WorktreeDeps, id: string, relocation: Relocation) => {
  try {
    deps.sessions.relocate(id, relocation)
    return undefined
  } catch (error) {
    return errorMessage(error)
  }
}
