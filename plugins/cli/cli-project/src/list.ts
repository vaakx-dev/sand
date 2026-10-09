import { loadGroups, noteOffline, type Location } from './groups'
import type { ProjectFlags } from './flags'
import type { Pcs } from './pcs'

const markers = (location: Location) => [location.missing && 'missing', !location.online && 'offline'].filter(Boolean)

export const listProjects = async (pcs: Pcs, _args: string[], { all }: ProjectFlags) => {
  const { groups, offline } = await loadGroups(pcs)
  noteOffline(offline)
  const shown = groups.filter(group => all || !group.hidden)
  if (!shown.length) return console.log('no saved projects yet; sand project add <path> saves one')
  for (const group of shown) {
    const head = [group.name, group.remote, group.hidden && '(hidden)'].filter(Boolean)
    console.log(head.join('  '))
    if (!group.locations.length) console.log('  no copies')
    for (const location of group.locations) {
      const marks = markers(location)
      console.log(`  ${location.pc.name}  ${location.path}${marks.length ? `  (${marks.join(', ')})` : ''}`)
    }
  }
}
