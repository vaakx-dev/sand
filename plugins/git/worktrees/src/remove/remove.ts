import { existsSync } from 'node:fs'
import type { RemoveCheck, RemoveResult } from '../contract'
import { rolledBack } from '../create/rollback'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { currentBranch, headCommit } from '../repo/refs'
import { gitStep, longGitMs } from '../repo/run'
import { threadsIn, withSessions } from '../sessions/inside'
import { relocateAll } from '../sessions/relocate'
import { lossMessage, removeCheck } from './check'
import { dropKeptHead, keepHead } from './kept-head'
import { keptNote, removedNote } from './notes'

export interface RemoveRequest {
  path: string
  force?: boolean | undefined
}

const loses = ({ uncommitted, unpushed }: RemoveCheck) => uncommitted > 0 || unpushed > 0

const lastHead = async (deps: WorktreeDeps, record: WorktreeRecord, exists: boolean) => {
  if (exists) return headCommit(deps.git, record.path)
  if (!record.branch) return undefined
  return deps.git.maybe(record.main, ['rev-parse', '--verify', '--quiet', `refs/heads/${record.branch}^{commit}`], { read: true })
}

const moveThreadsOut = (deps: WorktreeDeps, record: WorktreeRecord, branch: string | undefined) => {
  const inside = threadsIn(deps.sessions, record.path).map(session => session.id)
  const away = relocateAll(deps, inside, record.path, record.main, cwd => removedNote(record, branch, cwd))
  if (!away.failed.length) return away.moved
  const back = relocateAll(deps, away.moved, record.main, record.path, cwd => keptNote(record, cwd))
  throw new Error(`Couldn't move the threads out, so the worktree stays: ${[...away.failed, ...back.failed].join('; ')}`)
}

const detach = async (deps: WorktreeDeps, record: WorktreeRecord, exists: boolean) => {
  const args = exists ? ['worktree', 'remove', '--force', record.path] : ['worktree', 'prune']
  await gitStep(deps.git, record.main, args, "Couldn't remove the worktree", { timeoutMs: longGitMs })
}

const deleteBranch = async (deps: WorktreeDeps, record: WorktreeRecord, branch: string) => {
  await gitStep(deps.git, record.main, ['branch', '-D', branch], `The worktree is gone, but its branch ${branch} couldn't be deleted`).catch(deps.report)
}

const removeNow = async (deps: WorktreeDeps, record: WorktreeRecord, force: boolean): Promise<RemoveResult> => {
  const check = await removeCheck(deps, record)
  if (check.running || (loses(check) && !force)) return { removed: false, check, message: lossMessage(check) }
  const exists = existsSync(record.path)
  const head = (await lastHead(deps, record, exists)) || record.head
  const branch = exists ? await currentBranch(deps.git, record.path) : record.branch
  if (head) await keepHead(deps.git, record, head)
  await deps.setups.forget(record.path)
  let moved: string[] = []
  try {
    moved = moveThreadsOut(deps, record, branch)
    await detach(deps, record, exists)
  } catch (error) {
    throw await rolledBack(error, async () => {
      const back = relocateAll(deps, moved, record.main, record.path, cwd => keptNote(record, cwd))
      if (head) await dropKeptHead(deps.git, record)
      if (back.failed.length) throw new Error(`These threads stay in the main checkout: ${back.failed.join('; ')}`)
    })
  }
  if (branch && branch === record.branch && (force || check.unpushed === 0)) await deleteBranch(deps, record, branch)
  record.removed = Date.now()
  record.sessions = withSessions(record.sessions, moved)
  if (head) record.head = head
  if (branch) record.branch = branch
  delete record.temp
  await deps.store.save()
  return { removed: true }
}

export const sandRecord = async (deps: WorktreeDeps, path: string) => {
  await deps.store.ready()
  const record = deps.store.get(path)
  if (!record) throw new Error('Sand only removes and restores worktrees it made.')
  return record
}

export const removeWorktree = async (deps: WorktreeDeps, { path, force }: RemoveRequest): Promise<RemoveResult> => {
  const record = await sandRecord(deps, path)
  if (record.removed) throw new Error('This worktree is already removed.')
  const result = await deps.queue(record.main, () => removeNow(deps, record, Boolean(force)))
  if (result.removed) await deps.changed(record.main)
  return result
}
