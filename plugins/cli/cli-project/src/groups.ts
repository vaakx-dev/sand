import { mergeProjects } from '@sand/kit'
import type { Project, ProjectList } from '@sand/host-projects/contract'
import type { Pc, Pcs } from './pcs'

export interface Location {
  pc: Pc
  path: string
  added: number
  online: boolean
  missing: boolean
}

export interface Group {
  id: string
  name: string
  remote?: string
  hidden: boolean
  locations: Location[]
  updated: number
}

export interface Loaded {
  groups: Group[]
  offline: Pc[]
  device: string
  lists: Map<Pc, ProjectList>
}

const fetchLists = async ({ all, local, call }: Pcs) => {
  const fetchList = (pc: Pc) => call<ProjectList>({ type: 'projects.list' }, pc.device)
  const others = all.filter(pc => pc !== local)
  const [home, ...found] = await Promise.all([fetchList(local), ...others.map(pc => fetchList(pc).catch(() => undefined))])
  const lists = new Map<Pc, ProjectList>([[local, home]])
  others.forEach((pc, index) => {
    const list = found[index]
    if (list) lists.set(pc, list)
  })
  return { device: home.device, lists, offline: others.filter(pc => !lists.has(pc)) }
}

const groupProjects = (pcs: Pcs, lists: Map<Pc, ProjectList>, device: string): Group[] => {
  const pcOf = (id: string): Pc => (id === device ? pcs.local : pcs.all.find(pc => pc.device === id) ?? { device: id, name: id, url: '', key: '' })
  const order = (pc: Pc) => {
    const index = pcs.all.indexOf(pc)
    return index < 0 ? pcs.all.length : index
  }
  const merged = [...lists.values()].reduce<Project[]>((all, list) => mergeProjects(all, list.projects), [])
  const groupOf = (project: Project): Group => {
    const locations = Object.entries(project.copies)
      .filter(([, copy]) => !copy.removed)
      .map(([id, copy]): Location => {
        const pc = pcOf(id)
        const list = lists.get(pc)
        return { pc, path: copy.path, added: copy.added, online: !!list, missing: !!list?.missing.includes(project.id) }
      })
      .sort((a, b) => order(a.pc) - order(b.pc))
    const updated = Math.max(project.updated, ...Object.values(project.copies).map(copy => copy.updated))
    return { id: project.id, name: project.name, remote: project.remote, hidden: !!project.hidden, locations, updated }
  }
  return merged.filter(project => !project.deleted).map(groupOf).sort((a, b) => b.updated - a.updated)
}

export const loadGroups = async (pcs: Pcs): Promise<Loaded> => {
  const { device, lists, offline } = await fetchLists(pcs)
  return { groups: groupProjects(pcs, lists, device), offline, device, lists }
}

export const locationOn = (group: Group, pc: Pc) => group.locations.find(location => location.pc === pc)

export const describeGroup = (group: Group) => `${group.name} (${group.locations.map(location => `${location.pc.name} ${location.path}`).join(', ') || 'no copies'})`

export const noteOffline = (offline: Pc[]) => {
  for (const pc of offline) console.log(`note: ${pc.name} is offline`)
}
