import type { Machines, ProjectGroup, Wire } from '../contract'
import type { Context } from 'drydock'

interface Icon {
  url?: string
  tried: string
}

const iconPath = (project: string, version: number) => `/project-icon?${new URLSearchParams({ project, v: String(version) })}`

export const projectIcons = (ctx: Context, wire: Wire, machines: Machines) => {
  const icons = new Map<string, Icon>()
  let generation = 0

  const devicesFor = (group: ProjectGroup) => {
    const here = machines.here().id
    const usable = group.locations.filter(location => !location.missing && machines.online(location.device)).map(location => location.device)
    return [...usable.filter(device => device === here), ...usable.filter(device => device !== here)]
  }

  const fetchIcon = async (project: string, device: string) => {
    const version = await wire.call<number | null>({ type: 'projects.icon', project }, device)
    if (version === null) return undefined
    const response = await wire.fetch(iconPath(project, version), undefined, device)
    return response.ok ? response.blob() : undefined
  }

  const load = async (project: string, devices: string[], from: number) => {
    for (const device of devices) {
      const blob = await fetchIcon(project, device).catch(() => undefined)
      if (from !== generation || icons.get(project)?.url) return
      if (!blob) continue
      icons.set(project, { tried: devices.join(), url: URL.createObjectURL(blob) })
      ctx.emit('projects.change')
      return
    }
  }

  return {
    get(group: ProjectGroup) {
      const devices = devicesFor(group)
      const tried = devices.join()
      const icon = icons.get(group.id)
      if (icon?.url || icon?.tried === tried || !devices.length) return icon?.url
      icons.set(group.id, { tried })
      void load(group.id, devices, generation)
      return undefined
    },
    clear() {
      generation++
      for (const icon of icons.values()) if (icon.url) URL.revokeObjectURL(icon.url)
      icons.clear()
    },
  }
}
