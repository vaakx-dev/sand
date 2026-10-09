import { badge, div, icon, menuItem, span, type Child } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/protocol'
import { copyOn } from './group'
import { statusOf } from './status'
import { deviceOf, type PickerContext } from './target'

export const machineIcon = (machine?: Machine, size = 16) => icon(machine?.local === false ? 'monitor' : 'laptop', size)

const tag = (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  const status = statusOf(ctx, group, machine)
  if (!status) return undefined
  return status.muted ? span({ class: 'shrink-0 text-xs text-neutral-500' }, status.text) : badge(status.tone, status.text)
}

const where = (group: ProjectGroup, machine: Machine) => {
  const location = copyOn(group, deviceOf(machine))
  return location ? location.path : `${group.name} isn't on this PC yet`
}

const machineRow = (machine: Machine, selected: boolean, line: string, choose: () => void, end?: Child) =>
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
      span({ class: 'truncate text-xs text-neutral-500', title: line }, line),
    ),
    end,
  )

export const pcRow = (ctx: PickerContext, group: ProjectGroup, machine: Machine, selected: boolean, choose: () => void) =>
  machineRow(machine, selected, where(group, machine), choose, tag(ctx, group, machine))

export const quickRow = (machine: Machine, selected: boolean, choose: () => void, line = 'Quick thread') =>
  machineRow(machine, selected, line, choose, !machine.online && span({ class: 'shrink-0 text-xs text-neutral-500' }, 'Offline'))
