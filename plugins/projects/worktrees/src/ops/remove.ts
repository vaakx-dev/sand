import type { Session } from '@sand/sessions-sqlite/contract'
import { removedType, type RemovedEntry, type SettleResult } from '../contract'
import { changedCount, headOf, repoOf, unpushedCount, within, type Repo } from '../git/repo'
import { removeWorktree } from '../git/worktree'
import { readSetup } from '../setup/file'
import { idleIn, openSession, sessionsIn, type Ops } from './context'
import { relocate } from './relocate'

interface RemoveOptions {
  force?: boolean
  auto?: boolean
  branch?: string
  pr?: number
}

const moveOut = (session: Session, repo: Repo, head: string, why: string, pr?: number) => {
  const removed: RemovedEntry = { branch: repo.branch ?? '', path: repo.root, head, cwd: session.cwd, ...(pr && { pr }) }
  relocate(session, within(repo.root, session.cwd, repo.main), why)
  session.append(removedType, removed)
  return removed
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
  const why = options.pr ? `PR #${options.pr} was merged, so its worktree at ${repo.root} was removed.` : `The worktree at ${repo.root} was removed.`
  const removed = moveOut(session, repo, head, why, options.pr)
  ops.changed(repo.main)
  return { settled: true, removed }
}

export const removeWorktreeAt = async (ops: Ops, path: unknown) => {
  const repo = await repoOf(String(path ?? ''))
  if (!repo?.linked) throw new Error('That folder is not a worktree')
  idleIn(ops, repo.root)
  const inside = sessionsIn(ops, repo.root)
  const head = await headOf(repo.root)
  await removeWorktree(repo.main, repo.root, repo.branch, true)
  for (const summary of inside) {
    const session = ops.sessions.open(summary.id)
    if (session) moveOut(session, repo, head, `The worktree at ${repo.root} was removed.`)
  }
  ops.changed(repo.main)
}
