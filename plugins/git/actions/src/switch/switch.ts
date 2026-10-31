import type { GitProblem, GitResult } from '@sand/git/contract'
import type { GitActionResult, Switched } from '../contract'
import { type Explained, failedRun } from '../run/failure'
import { outputLines } from '../run/output'
import type { Job } from '../run/perform'
import { runLong, tooSlow } from '../run/step'
import { planSwitch, type SwitchRequest } from './plan'

const explainSwitch =
  ({ branch, from }: SwitchRequest) =>
  (problem: GitProblem, result: GitResult): Explained | undefined => {
    const lines = outputLines(result)
    if (problem.reason === 'dirty') return { message: `Switching to ${branch} would overwrite your uncommitted changes. Commit or stash them first.` }
    if (lines.some(line => /already exists/i.test(line))) return { message: `A branch called ${branch} already exists.` }
    if (lines.some(line => /already (checked out|used by worktree)/i.test(line))) return { message: `${branch} is already checked out in another worktree.` }
    if (problem.reason === 'not-found' && from) return { message: `There's no branch or commit called ${from}.` }
    return undefined
  }

export const switchBranch = async ({ git, repo, progress }: Job, request: SwitchRequest): Promise<GitActionResult<Switched>> => {
  const branch = request.branch.trim()
  const plan = await planSwitch(git, repo, { ...request, branch })
  if (!plan.ok) return plan
  progress.phase('switch')
  const { result, timedOut } = await runLong(git, repo.root, plan.args)
  if (timedOut) return tooSlow('Switching branches', result)
  if (result.code !== 0) return failedRun(git, result, plan.args, explainSwitch({ ...request, branch }))
  return { ok: true, branch, created: plan.created }
}
