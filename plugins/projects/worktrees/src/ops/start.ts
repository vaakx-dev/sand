import type { Session } from '@sand/sessions-sqlite/contract'
import { unnamedBranch } from '../contract'
import { repoOf, within } from '../git/repo'
import { addWorktree } from '../git/worktree'
import { freePlace } from '../place'
import { readSetup } from '../setup/file'
import { setupSteps } from '../setup/plan'
import { runSteps } from '../setup/steps'
import { forgetMarks } from './marks'
import type { Ops } from './types'

export const startInWorktree = async (ops: Ops, session: Session, base?: string) => {
  const repo = await repoOf(session.cwd)
  if (!repo) return
  const { branch, path } = await freePlace(ops.config.location, repo.main, repo.name, unnamedBranch(session.id))
  const setup = await readSetup([repo.main, repo.root], ops.config.auto_settle)
  const create = {
    label: `Create worktree on ${branch}`,
    async run() {
      await addWorktree(repo.root, branch, path, base?.trim() || repo.branch || 'HEAD')
      session.relocate(within(repo.root, session.cwd, path))
    },
  }
  await runSteps(session.id, [create, ...setupSteps(setup, repo.main, path)], ops.publish)
  forgetMarks()
  ops.changed(repo.main)
}
