import { removedType, type RemovedEntry, type SettleResult } from '../contract'
import { changedCount, headOf, repoOf, unpushedCount, within } from '../git/repo'
import { removeWorktree } from '../git/worktree'
import { readSetup } from '../setup/file'
import { forgetMarks } from './marks'
import { relocate } from './relocate'
import { openSession, type Ops } from './types'

export interface RemoveOptions {
  force?: boolean
  auto?: boolean
  branch?: string
  pr?: number
}

export const removeSessionWorktree = async (ops: Ops, id: unknown, options: RemoveOptions): Promise<SettleResult> => {
  const session = openSession(ops, id)
  if (ops.running.has(session.id)) return { settled: false, reason: 'running' }
  const repo = await repoOf(session.cwd)
  if (!repo?.linked) return { settled: false, reason: 'local' }
  if (options.branch && repo.branch !== options.branch) return { settled: false, reason: 'branch' }
  if (options.auto && !(await readSetup([repo.main], ops.config.auto_settle)).autoSettle) return { settled: false, reason: 'off' }
  const [changed, ahead] = await Promise.all([changedCount(repo.root), unpushedCount(repo.root)])
  if (!options.force && (changed || ahead)) return { settled: false, reason: changed ? 'changed' : 'unpushed', changed, ahead }
  const head = await headOf(repo.root)
  await removeWorktree(repo.main, repo.root, repo.branch, options.force)
  const removed: RemovedEntry = { branch: repo.branch ?? '', path: repo.root, head, cwd: session.cwd, ...(options.pr && { pr: options.pr }) }
  const why = options.pr ? `PR #${options.pr} was merged, so its worktree at ${repo.root} was removed.` : `The worktree at ${repo.root} was removed.`
  relocate(session, within(repo.root, session.cwd, repo.main), why)
  session.append(removedType, removed)
  forgetMarks()
  ops.changed(repo.main)
  return { settled: true, removed }
}
