import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { connectItem } from './connect'

const platforms: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

const describe = (machine: Machine) => {
  if (machine.local) return 'This device'
  if (!machine.online) return `Offline · ${machine.address ?? ''}`
  return [machine.platform && (platforms[machine.platform] ?? machine.platform), machine.address].filter(Boolean).join(' · ')
}

export const machineItem = (machine: Machine, next: (machine: Machine) => PalettePage): PaletteItem => ({
  id: `machine:${machine.id}`,
  icon: machine.local ? 'laptop' : 'monitor',
  label: machine.name,
  detail: describe(machine),
  search: machine.local ? 'this device local' : 'remote pc',
  disabled: !machine.online,
  page: () => next(machine),
})

export const wherePage = (ctx: ProjectsContext, next: (machine: Machine) => PalettePage): PalettePage => ({
  id: 'where',
  title: 'Where',
  placeholder: 'Search environments…',
  empty: 'No matching environments.',
  items: () => [...ctx.machines.list().map(machine => machineItem(machine, next)), connectItem(ctx)],
})
