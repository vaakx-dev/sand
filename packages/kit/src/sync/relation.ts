import type { SyncRelation, SyncState } from '@sand/protocol'

export const relationOf = (state: SyncState, against: SyncState): SyncRelation => {
  if (state.tree && state.tree === against.tree) return 'current'
  if (against.head && state.lineage.includes(against.head)) return 'ahead'
  if (state.head && against.lineage.includes(state.head)) return 'behind'
  return state.lineage.some(commit => against.lineage.includes(commit)) ? 'both' : 'unlinked'
}

export const relationLabel = (relation: SyncRelation, other: string) =>
  ({
    current: 'Up to date',
    ahead: `Newer than ${other}`,
    behind: `${other} has newer work`,
    both: 'Changed on both PCs',
    unlinked: 'Not synced yet',
  })[relation]
