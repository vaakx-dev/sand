import type { GitRunner } from '@sand/git-runner/contract'
import { isWithin } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Worktree } from '../contract'
import type { WorktreeDeps } from '../deps'
import { recordedWorktree } from '../list/shape'
import { applyStash } from '../move/carry'
import type { WorktreeRecord } from '../records/schema'
import { addWorktree } from '../repo/add'
import { branchExists } from '../repo/refs'
import { relocateAll } from '../sessions/relocate'
import { planSteps } from '../setup/plan'
import { doneStep, freshSetup } from '../setup/state'
import { dropKeptHead, keptHead } from './kept-head'
import { restoredNote } from './notes'
import { sandRecord } from './remove'

export interface RestoreRequest {
  path: string
}

const addArgs = async (git: GitRunner, record: WorktreeRecord) => {
  if (record.branch && (await branchExists(git, record.main, record.branch))) return [record.path, record.branch]
  const head = await keptHead(git, record)
  if (!head) throw new Error("The worktree's last commit is gone, so it can't be restored.")
  return record.branch ? ['-b', record.branch, record.path, head] : ['--detach', record.path, head]
}

export const waitingThreads = (deps: WorktreeDeps, record: WorktreeRecord) =>
  record.sessions.filter(id => {
    const session = deps.sessions.open(id)
    return session && isWithin(session.cwd, record.main) && !deps.store.containing(session.cwd)
  })

const appliedSaved = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  if (!record.saved) return true
  const failed = await applyStash(deps.git, record.path, record.saved)
  if (failed) deps.report(new Error(`Restored ${record.path}, but its set-aside changes didn't apply: ${failed.message} Run "git stash apply ${record.saved}" there.`))
  return !failed
}

const addBack = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  if (existsSync(record.path)) throw new Error(`${record.path} already exists. Move it away to restore the worktree.`)
  const args = await addArgs(deps.git, record)
  await mkdir(dirname(record.path), { recursive: true })
  await addWorktree(deps.git, record.main, args, "Couldn't restore the worktree")
  if (await appliedSaved(deps, record)) await dropKeptHead(deps.git, record).catch(deps.report)
  delete record.removed
  delete record.head
  delete record.saved
  delete record.parked
  record.setup = freshSetup(record.path, [doneStep('restore', `Restore ${record.path}`), ...(await planSteps(record.main))])
  await deps.store.save()
}

export const restoreRecord = async (deps: WorktreeDeps, record: WorktreeRecord, waiting: string[]) => {
  await deps.queue(record.main, () => addBack(deps, record))
  const back = await relocateAll(deps, waiting, record.main, record.path, cwd => restoredNote(record, cwd))
  if (record.setup && back.moved[0]) record.setup.session = back.moved[0]
  await deps.setups.start(record)
  await deps.changed(record.main, record.path)
  if (back.failed.length) deps.report(new Error(`The worktree at ${record.path} is back, but some threads stayed in the main checkout: ${back.failed.join('; ')}`))
  return back.moved
}

export const restoreWorktree = async (deps: WorktreeDeps, { path }: RestoreRequest): Promise<Worktree> => {
  const record = await sandRecord(deps, path)
  if (!record.removed) throw new Error('This worktree is still there.')
  const waiting = waitingThreads(deps, record)
  if (waiting.some(deps.busy)) throw new Error('Stop the thread first')
  return recordedWorktree(record, await restoreRecord(deps, record, waiting))
}
