import type { Session } from '@sand/sessions-sqlite/contract'
import { fetchOrigin } from '@sand/kit/git'
import { unnamedBranch } from '../contract'
import { isRemoteBranch, repoOf, within } from '../git/repo'
import { addWorktree } from '../git/worktree'
import { freePlace } from '../place'
import { readSetup } from '../setup/file'
import { setupSteps } from '../setup/plan'
import { runSteps } from '../setup/steps'
import type { Ops } from './context'

const fetchWaitMs = 15_000

const fetchStep = (root: string, base: string) => ({
  label: `Fetch ${base}`,
  run: () => Promise.race([fetchOrigin(root, 0), Bun.sleep(fetchWaitMs)]),
})

export const startInWorktree = async (ops: Ops, session: Session, base?: string) => {
  const repo = await repoOf(session.cwd)
  if (!repo) return
  const { branch, path } = await freePlace(ops.config.location, repo.main, repo.name, unnamedBranch(session.id))
  const setup = await readSetup([repo.main, repo.root], ops.config.auto_settle)
  const from = base?.trim() || repo.branch || 'HEAD'
  const create = {
    label: `Create worktree on ${branch}`,
    async run() {
      await addWorktree(repo.root, branch, path, from)
      session.relocate(within(repo.root, session.cwd, path))
    },
  }
  const fetch = (await isRemoteBranch(repo.root, from)) ? [fetchStep(repo.root, from)] : []
  await runSteps(session.id, [...fetch, create, ...setupSteps(setup, repo.main, path)], ops.publish)
  ops.changed(repo.main)
}
