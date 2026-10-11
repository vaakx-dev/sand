import type { Machines, ProjectEntry, ProjectGroup, Wire } from '../contract'
import type { Context } from 'drydock'
import { thisDevice } from '../remotes/route'

interface Icon {
  url?: string
}

const iconPath = (project: string, version: number) => `/project-icon?${new URLSearchParams({ project, v: String(version) })}`

const localFirst = (a: ProjectEntry, b: ProjectEntry) => Number(Boolean(a.device)) - Number(Boolean(b.device))

export const projectIcons = (ctx: Context, wire: Wire, machines: Machines) => {
  const icons = new Map<string, Icon>()
  let generation = 0

  const source = (group: ProjectGroup) =>
    [...group.locations].sort(localFirst).find(location => !location.missing && machines.online(location.device))

  const load = async (project: string, location: ProjectEntry, from: number) => {
    const device = location.device || thisDevice
    const version = await wire.call<number | null>({ type: 'projects.icon', project }, device)
    if (from !== generation || version === null) return
    const response = await wire.fetch(iconPath(project, version), undefined, device)
    if (!response.ok) return
    const blob = await response.blob()
    if (from !== generation) return
    icons.set(project, { url: URL.createObjectURL(blob) })
    ctx.emit('projects.change')
  }

  return {
    get(group: ProjectGroup) {
      if (!icons.has(group.id)) {
        const location = source(group)
        if (!location) return undefined
        icons.set(group.id, {})
        load(group.id, location, generation).catch(() => {})
      }
      return icons.get(group.id)?.url
    },
    clear() {
      generation++
      for (const icon of icons.values()) if (icon.url) URL.revokeObjectURL(icon.url)
      icons.clear()
    },
  }
}
