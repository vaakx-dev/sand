import { type GitRemote, type GitRepoLocal, type GitStatus, repoOf } from '@sand/git/contract'
import { plural } from '@sand/util'
import type { GitBaseAction } from '../contract'
import { hasCommitsToPush, isDiverged, upstreamName } from './facts'
import { pushAfterCommitReason } from './reasons'

const commitAction = (local: GitRepoLocal, remote: GitRemote | undefined): GitBaseAction => {
  const files = plural(local.fileCount, 'file')
  if (!local.isDefault && !pushAfterCommitReason(local, remote))
    return { id: 'commit-push', label: 'Commit & push', icon: 'push', title: `Commit ${files} with a message written from the diff, then push` }
  return { id: 'commit', label: 'Commit', icon: 'commit', title: `Commit ${files} with a message written from the diff` }
}

const syncAction = (local: GitRepoLocal, remote: GitRemote | undefined): GitBaseAction | undefined => {
  if (!remote?.remote) return undefined
  const to = upstreamName(remote)
  if (!remote.upstream) return hasCommitsToPush(local, remote) ? { id: 'push', label: 'Push', icon: 'push', title: `Push this branch to ${remote.remote}` } : undefined
  if (remote.ahead > 0) return { id: 'push', label: `Push ${remote.ahead}`, icon: 'push', title: `Push ${plural(remote.ahead, 'commit')} to ${to}` }
  if (remote.behind > 0) return { id: 'pull', label: `Pull ${remote.behind}`, icon: 'pull', title: `Pull ${plural(remote.behind, 'commit')} from ${to}` }
  return undefined
}

export const nextAction = (status: GitStatus | undefined, agent: boolean): GitBaseAction | undefined => {
  const local = repoOf(status)
  const remote = status?.remote
  if (!local || local.detached) return undefined
  if (remote && isDiverged(remote))
    return agent ? { id: 'rebase', label: 'Rebase…', icon: 'sparkles', title: `Diverged from ${upstreamName(remote)}. Ask the agent to rebase.` } : undefined
  if (local.fileCount > 0) return commitAction(local, remote)
  return syncAction(local, remote)
}
