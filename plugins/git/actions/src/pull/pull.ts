import type { GitProblem, GitResult } from '@sand/git/contract'
import type { GitActionResult, Pulled } from '../contract'
import { type Explained, failedRun, failure } from '../run/failure'
import { outputLines } from '../run/output'
import type { Job } from '../run/perform'
import { countCommits, currentBranch, headCommit, upstreamOf } from '../run/refs'
import { runLong, tooSlow } from '../run/step'

const diverged = /not possible to fast-forward|diverg/i

const explainPull =
  (upstream: string) =>
  (problem: GitProblem, result: GitResult): Explained | undefined => {
    if (outputLines(result).some(line => diverged.test(line)))
      return { reason: 'rejected', message: `Your branch and ${upstream} have diverged, so a pull can't simply catch up. Merge or rebase them first.` }
    if (problem.reason === 'dirty') return { message: 'Pulling would overwrite your uncommitted changes. Commit or stash them first.' }
    return undefined
  }

export const pullBranch = async ({ git, repo, progress }: Job): Promise<GitActionResult<Pulled>> => {
  if (!(await currentBranch(git, repo))) return failure('unknown', "You're not on a branch, so there's nothing to pull. Switch to a branch first.")
  const upstream = await upstreamOf(git, repo)
  if (!upstream) return failure('no-upstream', "This branch doesn't track a remote branch yet, so there's nothing to pull. Push it first.")
  const before = await headCommit(git, repo)
  progress.phase('pull')
  const args = ['pull', '--no-rebase', '--ff-only', '--progress']
  const { result, timedOut } = await runLong(git, repo.root, args, { onLine: progress.line })
  if (timedOut) return tooSlow('The pull', result)
  if (result.code !== 0) return failedRun(git, result, args, explainPull(upstream))
  return { ok: true, commits: await countCommits(git, repo, before ? [`${before}..HEAD`] : ['HEAD']) }
}
