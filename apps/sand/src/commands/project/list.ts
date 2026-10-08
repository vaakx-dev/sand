import { plural } from '@sand/kit'
import { loadGroups, noteOffline } from './groups'
import type { ProjectFlags } from './flags'
import type { Pcs } from './pcs'

export const listProjects = async (pcs: Pcs, _args: string[], { all }: ProjectFlags) => {
  const { groups, offline } = await loadGroups(pcs)
  noteOffline(offline)
  const shown = groups.filter(group => all || group.locations.some(location => !location.project.hidden))
  if (!shown.length) return console.log('no saved projects yet; sand project add <path> saves one')
  for (const group of shown) {
    const threads = group.locations.reduce((sum, location) => sum + location.project.threads, 0)
    console.log(`${group.name}  ${plural(threads, 'thread')}`)
    for (const { pc, project } of group.locations) {
      const markers = [project.hidden && 'hidden', project.missing && 'missing'].filter(Boolean)
      console.log(`  ${pc.name}  ${project.path}${markers.length ? `  (${markers.join(', ')})` : ''}`)
    }
  }
}
