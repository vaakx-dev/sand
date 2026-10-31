import type { PullSummary } from '@sand/github/contract'
import { readActivity } from '../activity/read'
import { freeBranch, preparePullBranch } from './branch'
import type { OpenDeps } from './open'

export const openInWorktree = async (deps: OpenDeps, main: string, pull: PullSummary): Promise<string> => {
  const worktrees = deps.worktrees()
  if (!worktrees) throw new Error(`Opening #${pull.number} in its own worktree needs the Worktrees plugin. Turn it on, or open the pull request in the main checkout.`)
  const head = await readActivity(deps.github, pull)
  const branch = await preparePullBranch(deps.git, main, pull, head)
  await freeBranch(deps.git, deps.repos, main, pull, branch)
  const thread = await worktrees.thread({ cwd: main, branch: branch.name, from: pull.base })
  return thread.id
}
