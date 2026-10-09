import { relationLabel, relationOf } from '@sand/kit'
import type { SyncState } from '@sand/protocol'
import { usage } from './usage'
import { findGroup } from './find'
import { loadGroups, noteOffline } from './groups'
import type { Pcs } from './pcs'

export const projectStatus = async (pcs: Pcs, [value]: string[]) => {
  if (!value) throw new Error(usage)
  const { groups, offline } = await loadGroups(pcs)
  noteOffline(offline)
  const group = findGroup(groups, value)
  const states = await Promise.all(
    group.locations
      .filter(location => location.online)
      .map(async location => ({ location, state: await pcs.call<SyncState>({ type: 'sync.state', path: location.path }, location.pc.device) })),
  )
  console.log(group.name)
  const newest = states.length ? states.reduce((best, entry) => (entry.state.updated > best.state.updated ? entry : best)) : undefined
  for (const entry of states) {
    const { location, state } = entry
    const label = !state.exists ? 'Folder missing' : !newest || entry === newest ? 'Most recent' : relationLabel(relationOf(state, newest.state), newest.location.pc.name)
    console.log(`  ${location.pc.name}  ${location.path}  ${label}`)
    state.conflicts.forEach(file => console.log(`    conflict  ${file}`))
  }
  for (const location of group.locations.filter(location => !location.online)) console.log(`  ${location.pc.name}  ${location.path}  offline`)
}
