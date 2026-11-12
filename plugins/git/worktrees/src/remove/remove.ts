import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RemoveCheck, RemoveResult } from '../contract'
import { rolledBack } from '../create/rollback'
import type { WorktreeDeps } from '../deps'
import { dropStash, restoreStash, stashChanges } from '../move/carry'
import type { WorktreeRecord } from '../records/schema'
import { longGitMs } from '../repo/timeout'
import { threadsIn, withSessions } from '../sessions/inside'
import { relocateAll } from '../sessions/relocate'
import { lossMessage, removeCheck, tipOf } from './check'
import { dropKeptHead, keepHead } from './kept-head'
import { clearFolder, clearLeftover } from './leftover'
import { keptNote, removedNote } from './notes'
import { putBack, setAside } from './trash'

export interface RemoveRequest {
  path: string
  force?: boolean | undefined
}

export type RemovedNote = (record: WorktreeRecord, branch: string | undefined, cwd: string) => string

const loses = ({ uncommitted, unpushed }: RemoveCheck) => uncommitted > 0 || unpushed > 0

const moveThreadsOut = async (deps: WorktreeDeps, record: WorktreeRecord, branch: string | undefined, note: RemovedNote) => {
  const inside = threadsIn(deps.sessions, record.path).map(session => session.id)
  const away = await relocateAll(deps, inside, record.path, record.main, cwd => note(record, branch, cwd))
  if (!away.failed.length) return away.moved
  const back = await relocateAll(deps, away.moved, record.main, record.path, cwd => keptNote(record, cwd))
  throw new Error(`Couldn't move the threads out, so the worktree stays: ${[...away.failed, ...back.failed].join('; ')}`)
}

const removing = { timeoutMs: longGitMs, what: "Couldn't remove the worktree" }

const prune = (deps: WorktreeDeps, record: WorktreeRecord) => deps.git.ok(record.main, ['worktree', 'prune'], removing)

const removeInPlace = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  await deps.git.ok(record.main, ['worktree', 'remove', '--force', record.path], removing)
  await clearLeftover(record.path)
}

const removeAside = async (deps: WorktreeDeps, record: WorktreeRecord, aside: string) => {
  try {
    await prune(deps, record)
  } catch (error) {
    await putBack(aside, record.path)
    throw error
  }
  clearFolder(aside).catch(deps.report)
}

const movable = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  const layout = await deps.repos.layout(record.path)
  return layout !== undefined && !existsSync(join(layout.gitDir, 'locked'))
}

const detach = async (deps: WorktreeDeps, record: WorktreeRecord, exists: boolean) => {
  if (!exists) {
    await prune(deps, record)
    return clearLeftover(record.path)
  }
  const aside = (await movable(deps, record)) ? await setAside(deps.folder, record.path) : undefined
  return aside ? removeAside(deps, record, aside) : removeInPlace(deps, record)
}

const deleteBranch = async (deps: WorktreeDeps, record: WorktreeRecord, branch: string) => {
  await deps.git.ok(record.main, ['branch', '-D', branch], { what: `The worktree is gone, but its branch ${branch} couldn't be deleted` }).catch(deps.report)
}

const removeNow = async (deps: WorktreeDeps, record: WorktreeRecord, force: boolean, note: RemovedNote): Promise<RemoveResult> => {
  const tip = await tipOf(deps, record)
  const check = await removeCheck(deps, record, tip)
  if (check.running || (loses(check) && !force)) return { removed: false, check, message: lossMessage(check, deps.keepDays.removed) }
  const { exists, branch } = tip
  const head = tip.head || record.head
  const saved = check.uncommitted ? await stashChanges(deps.git, record.path, check.uncommitted) : undefined
  const kept = saved?.commit ?? head
  await deps.setups.forget(record.path)
  let moved: string[] = []
  try {
    if (kept) await keepHead(deps.git, record, kept)
    if (saved) await dropStash(deps.git, record.path, saved)
    moved = await moveThreadsOut(deps, record, branch, note)
    await detach(deps, record, exists)
  } catch (error) {
    throw await rolledBack(error, async () => {
      const back = await relocateAll(deps, moved, record.main, record.path, cwd => keptNote(record, cwd))
      if (saved) await restoreStash(deps.git, record.path, saved)
      if (kept) await dropKeptHead(deps.git, record)
      if (back.failed.length) throw new Error(`These threads stay in the main checkout: ${back.failed.join('; ')}`)
    })
  }
  if (branch && branch === record.branch && !record.adopted && (force || check.unpushed === 0)) await deleteBranch(deps, record, branch)
  record.removed = Date.now()
  record.sessions = withSessions(record.sessions, moved)
  if (head) record.head = head
  if (saved) record.saved = saved.commit
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

export const removeWorktree = async (deps: WorktreeDeps, { path, force }: RemoveRequest, note: RemovedNote = removedNote): Promise<RemoveResult> => {
  const record = await sandRecord(deps, path)
  const result = await deps.queue(record.main, () => {
    if (record.removed) throw new Error('This worktree is already removed.')
    return removeNow(deps, record, Boolean(force), note)
  })
  if (result.removed) await deps.changed(record.main)
  return result
}
