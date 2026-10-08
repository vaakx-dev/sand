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
    group.locations.map(async location => ({ location, state: await pcs.call<SyncState>({ type: 'sync.state', path: location.project.path }, location.pc.device) })),
  )
  const newest = states.reduce((best, entry) => (entry.state.updated > best.state.updated ? entry : best))
  console.log(group.name)
  for (const entry of states) {
    const { location, state } = entry
    const label = !state.exists ? 'Folder missing' : entry === newest ? 'Most recent' : relationLabel(relationOf(state, newest.state), newest.location.pc.name)
    console.log(`  ${location.pc.name}  ${location.project.path}  ${label}`)
    state.conflicts.forEach(file => console.log(`    conflict  ${file}`))
  }
}
