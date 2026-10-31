import type { GitRepoLocal, GitStatus } from '@sand/git/contract'
import { plural } from '@sand/util'

export const repoOf = (status: GitStatus | undefined): GitRepoLocal | undefined => (status?.local.repo ? status.local : undefined)

export interface Block {
  text: string
  fix?: 'switch' | 'move'
}

export const blockOf = (status: GitStatus | undefined): Block | undefined => {
  if (!status) return undefined
  const local = repoOf(status)
  if (!local) return { text: 'This folder is not a git repo.' }
  if (local.detached || !local.branch) return { text: 'Check out a branch first.', fix: 'switch' }
  if (!status.remote?.remote) return { text: 'This repo has no remote to open a pull request on.' }
  if (local.isDefault) return { text: `You're on ${local.branch}. Move this change to its own branch first.`, fix: 'move' }
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
