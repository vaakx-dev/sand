import type { GitRunner } from '@sand/git/contract'
import type { GitActionResult } from '../contract'
import { failure } from '../run/failure'
import { countCommits, currentBranch, headCommit, listRemotes, readConfig, upstreamOf } from '../run/refs'
import type { Repo } from '../run/repo'

export interface PushTarget {
  branch: string
  remote: string
  upstream?: string
}

const remoteFor = async (git: GitRunner, repo: Repo, branch: string, tracked: boolean) =>
  (await readConfig(git, repo, `branch.${branch}.pushRemote`)) ??
  (await readConfig(git, repo, 'remote.pushDefault')) ??
  (tracked ? await readConfig(git, repo, `branch.${branch}.remote`) : undefined) ??
  'origin'

export const readPushTarget = async (git: GitRunner, repo: Repo): Promise<GitActionResult<PushTarget>> => {
  const branch = await currentBranch(git, repo)
  if (!branch) return failure('unknown', "You're not on a branch, so there's nothing to push. Switch to a branch first.")
  if (!(await headCommit(git, repo))) return failure('unknown', 'There are no commits to push yet.')
  const upstream = await upstreamOf(git, repo)
  const remote = await remoteFor(git, repo, branch, !!upstream)
  if (!(await listRemotes(git, repo)).includes(remote)) return failure('no-upstream', `This repository has no remote called ${remote} to push to. Add one first.`)
  return { ok: true, branch, remote, ...(upstream ? { upstream } : {}) }
}

export const countUnpushed = (git: GitRunner, repo: Repo, target: PushTarget) =>
  countCommits(git, repo, target.upstream ? ['@{u}..HEAD'] : ['HEAD', '--not', `--remotes=${target.remote}`])
