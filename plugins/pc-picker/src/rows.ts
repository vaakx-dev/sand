import { badge, div, icon, menuItem, span } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/protocol'
import { statusOf } from './status'
import { deviceOf, locationOn, type PickerContext } from './target'

export const machineIcon = (machine?: Machine, size = 16) => icon(machine?.local === false ? 'monitor' : 'laptop', size)

const tag = (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  const status = statusOf(ctx, group, machine)
  if (!status) return undefined
  return status.muted ? span({ class: 'shrink-0 text-xs text-neutral-500' }, status.text) : badge(status.tone, status.text)
}

const where = (group: ProjectGroup, machine: Machine) => {
  const location = locationOn(group, deviceOf(machine))
  return location ? location.path : `${group.name} isn't on this PC yet`
}

export const pcRow = (ctx: PickerContext, group: ProjectGroup, machine: Machine, selected: boolean, choose: () => void) =>
  menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(selected),
      active: selected,
      disabled: !machine.online,
      class: 'py-2 hover:bg-neutral-700',
      onClick: choose,
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, machineIcon(machine)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-baseline gap-2' },
        span({ class: 'truncate font-medium' }, machine.name),
        machine.local && span({ class: 'shrink-0 text-xs text-neutral-500' }, 'this PC'),
      ),
      span({ class: 'truncate text-xs text-neutral-500', title: where(group, machine) }, where(group, machine)),
    ),
    tag(ctx, group, machine),
  )
