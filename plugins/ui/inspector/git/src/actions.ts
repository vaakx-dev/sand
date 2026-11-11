import type { GitRemote, GitRepoLocal } from '@sand/git/contract'
import type { Pull } from '@sand/github/contract'

export type ActionId = 'commit' | 'merge' | 'push' | 'pull' | 'update' | 'discard'

export interface GitFacts {
  local: GitRepoLocal
  remote?: GitRemote
  pulls?: Pull[] | null
  mergeInto?: string
}

export interface Action {
  id: ActionId
  label: string
}

interface Facts extends GitFacts {
  dirty: boolean
}

const unpushed = ({ local, remote }: Facts) => {
  if (!local.branch || !remote) return 0
  return remote.upstream ? remote.ahead : remote.aheadBase
}

const openPull = (pulls: Pull[]) => pulls.some(pull => pull.state === 'open' || pull.state === 'draft')

const canOpenPull = ({ local, remote, pulls }: Facts) => !!pulls && !openPull(pulls) && !!local.branch && !local.isDefault && (remote?.aheadBase ?? 0) > 0

const labels: [ActionId, (facts: Facts) => string | undefined][] = [
  ['commit', ({ dirty }) => (dirty ? 'Commit' : undefined)],
  ['merge', ({ dirty, mergeInto }) => (mergeInto ? `${dirty ? 'Commit and merge' : 'Merge'} into ${mergeInto}` : undefined)],
  ['push', facts => (unpushed(facts) > 0 ? 'Push' : undefined)],
  ['pull', facts => (canOpenPull(facts) ? 'Open a PR' : undefined)],
  ['update', ({ local, remote }) => (local.branch && local.defaultBranch && remote?.behindBase ? `Update from ${local.defaultBranch}` : undefined)],
  ['discard', ({ dirty }) => (dirty ? 'Discard changes' : undefined)],
]

export const actionsFor = (facts: GitFacts): Action[] => {
  const all = { ...facts, dirty: facts.local.files.some(file => file.path.startsWith(facts.local.prefix)) }
  return labels.flatMap(([id, label]) => {
    const text = label(all)
    return text ? [{ id, label: text }] : []
  })
}

export const nextAction = (actions: Action[]) => actions.find(action => action.id !== 'discard')

export const stateText = ({ local, remote }: GitFacts) => {
  if (!local.branch || !remote) return ''
  if (!remote.upstream) return remote.aheadBase > 0 ? `${remote.aheadBase} not pushed` : ''
  const parts = [
    [remote.ahead, 'ahead'],
    [remote.behind, 'behind'],
  ] as const
  return parts.flatMap(([count, word]) => (count > 0 ? [`${count} ${word}`] : [])).join(', ')
}
