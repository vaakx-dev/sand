import type { PalettePage } from '@sand/palette/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../../context'
import { machineItem } from '../where'

const hasCopy = (group: ProjectGroup, device?: string) => group.locations.some(location => location.device === device && !location.missing)

export const devicesPage = (ctx: ProjectsContext, group: ProjectGroup, next: (machine: Machine) => PalettePage): PalettePage => ({
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
