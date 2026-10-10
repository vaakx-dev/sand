import { removedType, type MoveResult, type RemovedEntry } from '../contract'
import { existsSync } from 'node:fs'
import { repoOf } from '../git/repo'
import { restoreWorktree } from '../git/worktree'
import { readSetup } from '../setup/file'
import { setupSteps } from '../setup/plan'
import { runSteps } from '../setup/steps'
import { forgetMarks } from './marks'
import { relocate } from './relocate'
import { idle, openSession, type Ops } from './types'

export const restoreSession = async (ops: Ops, id: unknown, entryId: unknown): Promise<MoveResult> => {
  const session = openSession(ops, id)
  idle(ops, session.id)
  const entry = session.entries().find(candidate => candidate.id === entryId && candidate.type === removedType)
  if (!entry) throw new Error('Nothing to restore')
  const removed = entry.data as RemovedEntry
  if (existsSync(removed.path)) throw new Error(`${removed.path} already exists`)
  const repo = await repoOf(session.cwd)
  if (!repo) throw new Error("This thread's folder isn't in a git repository")
  const setup = await readSetup([repo.main], ops.config.auto_settle)
  const restore = {
    label: `Restore worktree on ${removed.branch}`,
    async run() {
      await restoreWorktree(repo.main, removed.branch, removed.path, removed.head)
      relocate(session, removed.cwd, `This thread is back in its git worktree on branch ${removed.branch}.`)
    },
  }
  const outcome = await runSteps(session.id, [restore, ...setupSteps(setup, repo.main, removed.path)], ops.publish)
  forgetMarks()
  ops.changed(repo.main)
  if (outcome.failed === 0) throw new Error(outcome.error)
  return { path: removed.path, branch: removed.branch }
}
