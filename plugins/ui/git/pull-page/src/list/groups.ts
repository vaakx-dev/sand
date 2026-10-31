import type { InboxGroup, InboxPull, InboxView } from '@sand/pull-inbox/contract'
import { pullKey } from '../pull/ref'

export type ListEntry = { kind: 'group'; key: string; title: string } | { kind: 'pull'; key: string; pull: InboxPull }

const groups: { group: InboxGroup; title: string }[] = [
  { group: 'turn', title: 'Your turn' },
  { group: 'ready', title: 'Ready to merge' },
  { group: 'waiting', title: 'Waiting' },
  { group: 'done', title: 'Done' },
]

const pullEntry = (pull: InboxPull): ListEntry => ({ kind: 'pull', key: pullKey(pull), pull })

const newestFirst = (pulls: InboxPull[]) => [...pulls].sort((a, b) => b.updated - a.updated)

const grouped = (pulls: InboxPull[]) =>
  groups.flatMap(({ group, title }): ListEntry[] => {
    const members = pulls.filter(pull => pull.reason.group === group)
    return members.length ? [{ kind: 'group', key: `group:${group}`, title }, ...members.map(pullEntry)] : []
  })

export const listEntries = (view: InboxView, pulls: InboxPull[]): ListEntry[] => (view === 'needs' ? grouped(pulls) : newestFirst(pulls).map(pullEntry))
