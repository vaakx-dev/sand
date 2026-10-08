import type { Machine, PalettePage, ProjectGroup } from '@sand/protocol'
import { machineItem } from '../where'
import { deviceOf, type FlowContext } from '../types'

export const devicesPage = (ctx: FlowContext, group: ProjectGroup, next: (machine: Machine) => PalettePage): PalettePage => ({
  id: 'add-device',
  title: `Add ${group.name} on another PC`,
  placeholder: 'Search PCs…',
  empty: 'No other online PC without this project.',
  items: () => {
    const has = new Set(group.locations.map(location => location.device))
    return ctx.machines
      .list()
      .filter(machine => machine.online && !has.has(deviceOf(machine)))
      .map(machine => machineItem(machine, next))
  },
})
