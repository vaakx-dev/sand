import { badge, div, icon, menuItem, span, type Child, type ContextMenu, type MenuSpec } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { rowMenu } from './row-menu'
import { statusOf } from './status'
import { deviceOf, type PickerContext } from './target'

interface RowMenu {
  menu: ContextMenu
  spec: () => MenuSpec
}

export const machineIcon = (machine?: Machine, size = 16) => icon(machine?.local === false ? 'monitor' : 'laptop', size)

const tag = (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  const status = statusOf(ctx, group, machine)
  if (!status) return undefined
  return status.muted ? span({ class: 'shrink-0 text-xs text-neutral-500' }, status.text) : badge(status.tone, status.text)
}

const machineRow = (machine: Machine, selected: boolean, choose: () => void, end?: Child, context?: RowMenu) =>
  menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(selected),
      active: selected,
      disabled: !machine.online,
      class: 'py-2 hover:bg-neutral-700',
      ...(context ? context.menu.target(context.spec, choose) : { onClick: choose }),
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, machineIcon(machine)),
    span({ class: 'min-w-0 flex-1 truncate font-medium' }, machine.name),
    end,
  )

export const pcRow = (ctx: PickerContext, group: ProjectGroup, machine: Machine, selected: boolean, choose: () => void, menu: ContextMenu) =>
  machineRow(machine, selected, choose, tag(ctx, group, machine), { menu, spec: () => rowMenu(ctx, group, machine, choose) })

export const quickRow = (machine: Machine, selected: boolean, choose: () => void) =>
  machineRow(machine, selected, choose, !machine.online && span({ class: 'shrink-0 text-xs text-neutral-500' }, 'Offline'))
