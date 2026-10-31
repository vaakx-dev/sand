import type { GitRemote, GitRepoLocal } from '@sand/git/contract'

export const isDiverged = (remote: GitRemote | undefined) => Boolean(remote && remote.ahead > 0 && remote.behind > 0)

export const hasCommitsToPush = (local: GitRepoLocal, remote: GitRemote) => {
  if (remote.upstream) return remote.ahead > 0
  if (local.isDefault || !remote.base) return Boolean(local.head)
  return remote.aheadBase > 0
}

export const upstreamName = (remote: GitRemote) => remote.upstream ?? remote.remote ?? 'the remote'

export const defaultName = (local: GitRepoLocal) => local.defaultBranch ?? 'the default branch'

export const notOnBranch = 'Not on a branch. Switch to one first.'

export const waitReason = 'Agent is working'

export const busyReason = 'Git is busy'
