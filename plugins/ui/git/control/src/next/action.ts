import type { GitRemote, GitRepoLocal, GitStatus } from '@sand/git/contract'
import type { GitBaseAction, GitBaseId } from '../contract'
import { hasCommitsToPush, isDiverged, notOnBranch, repoOf, upstreamName } from './facts'

const blocked = (id: GitBaseId, label: string, reason: string): GitBaseAction => ({ id, label, short: label, disabled: true, reason })

const commitAction = (local: GitRepoLocal, remote: GitRemote | undefined): GitBaseAction => {
  const pushable = Boolean(remote?.remote) && !local.isDefault && !remote?.behind
  if (pushable) return { id: 'commit-push', label: 'Commit & push', short: 'Ship', icon: 'push' }
  return { id: 'commit', label: 'Commit', short: 'Commit', icon: 'commit' }
}

const syncAction = (local: GitRepoLocal, remote: GitRemote | undefined): GitBaseAction | undefined => {
  if (!remote?.remote) return undefined
  if (!remote.upstream) return hasCommitsToPush(local, remote) ? { id: 'push', label: 'Push', short: 'Push', icon: 'push' } : undefined
  if (remote.ahead > 0) return { id: 'push', label: `Push ${remote.ahead}`, short: `Push ${remote.ahead}`, icon: 'push' }
  if (remote.behind > 0) return { id: 'pull', label: `Pull ${remote.behind}`, short: `Pull ${remote.behind}`, icon: 'pull' }
  return undefined
}

export const nextAction = (status: GitStatus | undefined): GitBaseAction | undefined => {
  const local = repoOf(status)
  if (!local) return undefined
  const remote = status?.remote
  const changed = local.fileCount > 0
  if (local.detached) return changed ? blocked('detached', 'Detached', notOnBranch) : undefined
  if (remote && isDiverged(remote)) return blocked('diverged', 'Diverged', `This branch and ${upstreamName(remote)} both have new commits. Rebase first.`)
  if (changed) return commitAction(local, remote)
  return syncAction(local, remote)
}
