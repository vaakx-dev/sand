import { relationLabel, relationOf } from '@sand/sync/flows'
import type { SyncState } from '@sand/sync/contract'
import { usage } from './usage'
import { findGroup } from './find'
import { loadGroups, noteOffline, type Location } from './groups'
import type { Pcs } from './pcs'

interface CopyState {
  location: Location
  state: SyncState
}

const copyLabel = (copy: CopyState, newest: CopyState) => {
  if (!copy.state.exists) return 'Folder missing'
  if (copy === newest) return 'Most recent'
  return relationLabel(relationOf(copy.state, newest.state), newest.location.pc.name)
}

const printCopies = (copies: CopyState[]) => {
  const newest = copies.reduce((best, copy) => (copy.state.updated > best.state.updated ? copy : best))
  for (const copy of copies) {
    console.log(`  ${copy.location.pc.name}  ${copy.location.path}  ${copyLabel(copy, newest)}`)
    copy.state.conflicts.forEach(file => console.log(`    conflict  ${file}`))
  }
}

export const projectStatus = async (pcs: Pcs, [value]: string[]) => {
  if (!value) throw new Error(usage)
  const { groups, offline } = await loadGroups(pcs)
  noteOffline(offline)
  const group = findGroup(groups, value)
  const online = group.locations.filter(location => location.online)
  const copies = await Promise.all(
    online.map(async location => ({ location, state: await pcs.call<SyncState>({ type: 'sync.state', path: location.path }, location.pc.id) })),
  )
  console.log(group.name)
  if (copies.length) printCopies(copies)
  for (const location of group.locations.filter(location => !location.online)) console.log(`  ${location.pc.name}  ${location.path}  offline`)
}
