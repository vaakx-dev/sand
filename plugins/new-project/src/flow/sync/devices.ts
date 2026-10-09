import type { Machine, PalettePage, ProjectGroup } from '@sand/protocol'
import { machineItem } from '../where'
import { deviceOf, type FlowContext } from '../types'
import { hasCopy } from './source'

export const devicesPage = (ctx: FlowContext, group: ProjectGroup, next: (machine: Machine) => PalettePage): PalettePage => ({
  id: 'add-device',
  title: `Add ${group.name} on another PC`,
  placeholder: 'Search PCs…',
  empty: 'No other online PC without this project.',
  items: () =>
    ctx.machines
      .list()
      .filter(machine => machine.online && !hasCopy(group, deviceOf(machine)))
      .map(machine => machineItem(machine, next)),
})
