import type { GitProblem, GitResult } from '@sand/git/contract'
import type { GitActionFailure, GitActionResult, Pushed } from '../contract'
import { findHooks, hookFailed } from '../hooks/find'
import { failedRun, failure } from '../run/failure'
import { outputLines, outputTail } from '../run/output'
import type { Job } from '../run/perform'
import { upstreamOf } from '../run/refs'
import { runLong, tooSlow } from '../run/step'
import { countUnpushed, type PushTarget, readPushTarget } from './target'

const remoteRejected = /\[remote rejected\][^(]*\(([^)]+)\)/

const explainRejection = (problem: GitProblem, result: GitResult, remote: string) => {
  if (problem.reason !== 'rejected') return undefined
  const refused = outputLines(result)
    .map(line => remoteRejected.exec(line)?.[1])
    .find(Boolean)
  return { message: refused ? `${remote} refused the push: ${refused}.` : `${remote} has commits you don't have. Pull first.` }
}

const pushFailed = async (job: Job, result: GitResult, args: string[], target: PushTarget): Promise<GitActionFailure> => {
  const failed = failedRun(job.git, result, args, (problem, output) => explainRejection(problem, output, target.remote))
  if (failed.reason !== 'unknown' || !/failed to push some refs/i.test(failed.output ?? '')) return failed
  const hooks = await findHooks(job.git, job.repo, ['pre-push'])
  return hooks.length ? failure('hook', hookFailed(hooks, 'pushed'), outputTail(result)) : failed
}

export const pushBranch = async (job: Job): Promise<GitActionResult<Pushed>> => {
  const { git, repo, progress } = job
  const target = await readPushTarget(git, repo)
  if (!target.ok) return target
  const commits = await countUnpushed(git, repo, target)
  progress.phase('push')
  const args = target.upstream ? ['push', '--progress'] : ['push', '--progress', '-u', target.remote, 'HEAD']
  const { result, timedOut } = await runLong(git, repo.root, args, { onLine: progress.line })
  if (timedOut) return tooSlow('The push', result)
  if (result.code !== 0) return pushFailed(job, result, args, target)
  const upstream = (await upstreamOf(git, repo)) ?? `${target.remote}/${target.branch}`
  return { ok: true, upstream, commits }
}
