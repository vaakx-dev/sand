import type { PalettePage } from '@sand/palette/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { machineItem } from '../where'
import type { FlowContext } from '../types'
import { hasCopy } from './source'

export const devicesPage = (ctx: FlowContext, group: ProjectGroup, next: (machine: Machine) => PalettePage): PalettePage => ({
  id: 'add-device',
  title: `Add ${group.name} on another PC`,
  placeholder: 'Search PCs…',
  empty: 'No other online PC without this project.',
  items: () =>
    ctx.machines
      .list()
      .filter(machine => machine.online && !hasCopy(group, machine.device))
      .map(machine => machineItem(machine, next)),
})
