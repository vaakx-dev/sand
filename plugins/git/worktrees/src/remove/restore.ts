import type { GitRunner } from '@sand/git/contract'
import { isWithin } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Worktree } from '../contract'
import type { WorktreeDeps } from '../deps'
import { recordedWorktree } from '../list/shape'
import type { WorktreeRecord } from '../records/schema'
import { branchExists } from '../repo/refs'
import { longGitMs } from '../repo/timeout'
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

const waitingThreads = (deps: WorktreeDeps, record: WorktreeRecord) =>
  record.sessions.filter(id => {
    const session = deps.sessions.open(id)
    return session && isWithin(session.cwd, record.main) && !deps.store.containing(session.cwd)
  })

const addBack = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  if (existsSync(record.path)) throw new Error(`${record.path} already exists. Move it away to restore the worktree.`)
  const args = await addArgs(deps.git, record)
  await mkdir(dirname(record.path), { recursive: true })
  await deps.git.ok(record.main, ['worktree', 'add', ...args], { timeoutMs: longGitMs, what: "Couldn't restore the worktree" })
  await dropKeptHead(deps.git, record).catch(deps.report)
  delete record.removed
  delete record.head
  record.setup = freshSetup(record.path, [doneStep('restore', `Restore ${record.path}`), ...(await planSteps(record.main))])
  await deps.store.save()
}

export const restoreWorktree = async (deps: WorktreeDeps, { path }: RestoreRequest): Promise<Worktree> => {
  const record = await sandRecord(deps, path)
  if (!record.removed) throw new Error('This worktree is still there.')
  const waiting = waitingThreads(deps, record)
  if (waiting.some(deps.busy)) throw new Error('Stop the thread first')
  await deps.queue(record.main, () => addBack(deps, record))
  const back = relocateAll(deps, waiting, record.main, record.path, cwd => restoredNote(record, cwd))
  if (record.setup && back.moved[0]) record.setup.session = back.moved[0]
  await deps.setups.start(record)
  await deps.changed(record.main, record.path)
  if (back.failed.length) deps.report(new Error(`The worktree at ${record.path} is back, but some threads stayed in the main checkout: ${back.failed.join('; ')}`))
  return recordedWorktree(record, back.moved)
}
