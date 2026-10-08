import type { Project, ProjectList } from '@sand/protocol'
import type { Pc, Pcs } from './pcs'

export interface Location {
  pc: Pc
  project: Project
}

export interface Group {
  name: string
  locations: Location[]
  updated: number
}

export interface Loaded {
  groups: Group[]
  offline: Pc[]
}

const groupOf = (locations: Location[]): Group => ({
  name: (locations.find(location => !location.pc.device) ?? locations[0])!.project.name,
  locations,
  updated: Math.max(...locations.map(location => location.project.updated)),
})

export const loadGroups = async (pcs: Pcs): Promise<Loaded> => {
  const offline: Pc[] = []
  const lists = await Promise.all(
    pcs.all.map(async pc => {
      try {
        return { pc, list: await pcs.call<ProjectList>({ type: 'projects.list' }, pc.device) }
      } catch {
        offline.push(pc)
        return undefined
      }
    }),
  )
  const linked = new Map<string, Location[]>()
  const lone: Location[][] = []
  for (const entry of lists) {
    for (const project of entry?.list.projects ?? []) {
      const location = { pc: entry!.pc, project }
      if (!project.link) lone.push([location])
      else linked.set(project.link, [...(linked.get(project.link) ?? []), location])
    }
  }
  const groups = [...linked.values(), ...lone].map(groupOf).sort((a, b) => b.updated - a.updated)
  return { groups, offline }
}

export const locationOn = (group: Group, pc: Pc) => group.locations.find(location => location.pc.device === pc.device)

export const describeGroup = (group: Group) => `${group.name} (${group.locations.map(location => `${location.pc.name} ${location.project.path}`).join(', ')})`

export const noteOffline = (offline: Pc[]) => {
  for (const pc of offline) console.log(`note: ${pc.name} is offline, skipped`)
}
