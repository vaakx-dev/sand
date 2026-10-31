import type { GitRemote, GitRepoLocal } from '@sand/git/contract'
import { hasCommitsToPush, isDiverged, notOnBranch, upstreamName } from './facts'

const noRemote = 'This repo has no remote'

export const commitReason = (local: GitRepoLocal) => {
  if (local.detached) return notOnBranch
  return local.fileCount === 0 ? 'No changes to commit' : undefined
}

export const pushReason = (local: GitRepoLocal, remote: GitRemote | undefined) => {
  if (local.detached) return notOnBranch
  if (!remote?.remote) return noRemote
  if (isDiverged(remote)) return `Diverged from ${upstreamName(remote)}. Rebase first.`
  if (hasCommitsToPush(local, remote)) return undefined
  return local.fileCount > 0 || !remote.upstream ? 'Nothing to push yet. Commit first.' : `Up to date with ${remote.remote}`
}

export const pullReason = (local: GitRepoLocal, remote: GitRemote | undefined) => {
  if (local.detached) return notOnBranch
  if (!remote?.remote) return noRemote
  if (!remote.upstream) return `This branch isn't on ${remote.remote} yet`
  return remote.behind === 0 ? `Up to date with ${remote.remote}` : undefined
}

export const catchUpBehind = (local: GitRepoLocal, remote: GitRemote | undefined) =>
  !local.isDefault && !local.detached && remote?.base ? remote.behindBase : 0
