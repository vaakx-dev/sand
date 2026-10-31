import type { GitRemote, GitRepoLocal } from '@sand/git/contract'
import { hasCommitsToPush, isDiverged, notOnBranch, upstreamName } from './facts'

export interface Reason {
  short: string
  full: string
}

const detached: Reason = { short: 'Not on a branch', full: notOnBranch }

const noRemote: Reason = { short: 'No remote', full: 'This repo has no remote' }

const upToDate = (remote: GitRemote): Reason => ({ short: 'Up to date', full: `Up to date with ${upstreamName(remote)}` })

export const commitReason = (local: GitRepoLocal): Reason | undefined => {
  if (local.detached) return detached
  return local.fileCount === 0 ? { short: 'No changes', full: 'No changes to commit' } : undefined
}

export const pushReason = (local: GitRepoLocal, remote: GitRemote | undefined): Reason | undefined => {
  if (local.detached) return detached
  if (!remote?.remote) return noRemote
  if (isDiverged(remote)) return { short: 'Rebase first', full: `Diverged from ${upstreamName(remote)}. Rebase first.` }
  if (hasCommitsToPush(local, remote)) return undefined
  if (local.fileCount > 0) return { short: 'Commit first', full: 'Nothing to push yet. Commit first.' }
  return remote.upstream && remote.behind === 0 ? upToDate(remote) : { short: 'Nothing to push', full: 'Nothing to push yet' }
}

export const pushAfterCommitReason = (local: GitRepoLocal, remote: GitRemote | undefined): string | undefined => {
  if (local.detached) return notOnBranch
  if (!remote?.remote) return `${noRemote.full}, so there is nowhere to push.`
  if (isDiverged(remote)) return `Diverged from ${upstreamName(remote)}. Rebase before pushing.`
  return remote.behind > 0 ? `Behind ${upstreamName(remote)}. Pull before pushing.` : undefined
}

export const pullReason = (local: GitRepoLocal, remote: GitRemote | undefined): Reason | undefined => {
  if (local.detached) return detached
  if (!remote?.remote) return noRemote
  if (!remote.upstream) return { short: `Not on ${remote.remote} yet`, full: `This branch isn't on ${remote.remote} yet` }
  return remote.behind === 0 ? upToDate(remote) : undefined
}

export const catchUpBehind = (local: GitRepoLocal, remote: GitRemote | undefined) =>
  !local.isDefault && !local.detached && remote?.base ? remote.behindBase : 0
