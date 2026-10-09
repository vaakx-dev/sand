import type { Machine, PaletteItem, PalettePage } from '@sand/protocol'
import { connectItem } from './connect'
import type { FlowContext } from './types'

const platforms: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

const describe = (machine: Machine) => {
  if (machine.local) return 'This device'
  const where = [machine.platform && (platforms[machine.platform] ?? machine.platform), machine.address].filter(Boolean).join(' · ')
  return machine.online ? where : `Offline · ${machine.address ?? ''}`
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

export const wherePage = (ctx: FlowContext, next: (machine: Machine) => PalettePage): PalettePage => ({
  id: 'where',
  title: 'Where',
  placeholder: 'Search environments…',
  empty: 'No matching environments.',
  items: () => [
    ...ctx.machines.list().map(machine => machineItem(machine, next)),
    connectItem(ctx),
  ],
})
