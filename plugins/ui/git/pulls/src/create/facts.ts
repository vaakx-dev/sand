import type { GitRepoLocal, GitStatus } from '@sand/git/contract'
import { plural } from '@sand/util'

export const repoOf = (status: GitStatus | undefined): GitRepoLocal | undefined => (status?.local.repo ? status.local : undefined)

export const blockReason = (status: GitStatus | undefined): string | undefined => {
  if (!status) return undefined
  const local = repoOf(status)
  if (!local) return 'This folder is not a git repo.'
  if (local.detached || !local.branch) return 'Check out a branch first.'
  if (!status.remote?.remote) return 'This repo has no remote to open a pull request on.'
  if (local.isDefault) return `You're on ${local.branch}. Switch to a branch for this change first.`
  return undefined
}

export const dirtyNote = (status: GitStatus | undefined) => {
  const count = repoOf(status)?.fileCount ?? 0
  return count > 0 ? `${plural(count, 'file')} not committed. They won't be in the pull request.` : undefined
}

export const baseOf = (status: GitStatus | undefined) => status?.remote?.base ?? repoOf(status)?.defaultBranch

export const needsPush = (status: GitStatus | undefined) => {
  const remote = status?.remote
  return Boolean(remote?.remote) && (!remote?.upstream || (remote?.ahead ?? 0) > 0)
}

export const writtenFrom = (status: GitStatus | undefined) => {
  const commits = status?.remote?.aheadBase ?? 0
  return commits > 0 ? `Written from ${plural(commits, 'commit')} and the thread` : 'Written from the branch and the thread'
}
