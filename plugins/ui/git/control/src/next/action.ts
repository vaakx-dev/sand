import type { GitPhase } from '@sand/git-actions/contract'
import type { GitRemote, GitRepoLocal, GitStatus } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import { hasCommitsToPush, isDiverged, notOnBranch, repoOf, upstreamName, waitReason } from './facts'
import { phaseLabels } from './phases'

export type ActionId = 'commit' | 'commit-push' | 'push' | 'pull' | 'diverged' | 'detached' | 'busy'

export interface NextAction {
  id: ActionId
  label: string
  short: string
  icon?: IconName
  disabled?: boolean
  busy?: boolean
  reason?: string
}

export interface ActionContext {
  running: boolean
  phase?: GitPhase
}

const blocked = (id: ActionId, label: string, reason: string): NextAction => ({ id, label, short: label, disabled: true, reason })

const commitAction = (local: GitRepoLocal, remote: GitRemote | undefined): NextAction => {
  const pushable = Boolean(remote?.remote) && !local.isDefault && !remote?.behind
  if (pushable) return { id: 'commit-push', label: 'Commit & push', short: 'Ship', icon: 'push' }
  return { id: 'commit', label: 'Commit', short: 'Commit', icon: 'commit' }
}

const syncAction = (local: GitRepoLocal, remote: GitRemote | undefined): NextAction | undefined => {
  if (!remote?.remote) return undefined
  if (!remote.upstream) return hasCommitsToPush(local, remote) ? { id: 'push', label: 'Push', short: 'Push', icon: 'push' } : undefined
  if (remote.ahead > 0) return { id: 'push', label: `Push ${remote.ahead}`, short: `Push ${remote.ahead}`, icon: 'push' }
  if (remote.behind > 0) return { id: 'pull', label: `Pull ${remote.behind}`, short: `Pull ${remote.behind}`, icon: 'pull' }
  return undefined
}

const idleAction = (local: GitRepoLocal, remote: GitRemote | undefined): NextAction | undefined => {
  const changed = local.fileCount > 0
  if (local.detached) return changed ? blocked('detached', 'Detached', notOnBranch) : undefined
  if (remote && isDiverged(remote)) return blocked('diverged', 'Diverged', `This branch and ${upstreamName(remote)} both have new commits. Rebase first.`)
  return changed ? commitAction(local, remote) : syncAction(local, remote)
}

export const nextAction = (status: GitStatus | undefined, context: ActionContext): NextAction | undefined => {
  const local = repoOf(status)
  if (!local) return undefined
  if (context.phase) {
    const label = phaseLabels[context.phase]
    return { id: 'busy', label, short: label, busy: true, disabled: true }
  }
  const action = idleAction(local, status?.remote)
  if (!action || action.disabled || !context.running) return action
  return { ...action, disabled: true, reason: waitReason }
}
