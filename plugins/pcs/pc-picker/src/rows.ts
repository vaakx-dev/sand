import type { MenuSpec } from '@sand/protocol'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import { rowMenu } from './row-menu'
import { statusOf } from './status'
import type { PickerContext } from './target'

interface MachineRow {
  selected: boolean
  disabled?: boolean
  label?: Child
  end?: Child
  choose(): void
  menu?: { context: ContextMenu; spec: () => MenuSpec }
}

export const machineGlyph = (machine?: Machine) => (machine?.local === false ? 'monitor' : 'laptop')

export const sideNote = (text: string) => span({ class: 'shrink-0 text-xs text-neutral-500' }, text)

export const offlineNote = (machine: Machine) => (machine.online ? null : sideNote('Offline'))

export const machineList = ({ groupLabel }: Kit, title: string, rows: HTMLElement[], notice?: Child) =>
  div({ class: 'flex flex-col' }, groupLabel(title), notice, ...rows)

export const machineRow = ({ choiceItem }: Kit, machine: Machine, { selected, disabled = !machine.online, label, end, choose, menu }: MachineRow) =>
  choiceItem(
    {
      selected,
      icon: machineGlyph(machine),
      disabled,
      class: 'py-2',
      ...(menu ? menu.context.target(menu.spec, choose) : { onClick: choose }),
    },
    label ?? span({ class: 'min-w-0 flex-1 truncate font-medium' }, machine.name),
    end,
  )

const tag = (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  const { badge } = ctx.kit
  const status = statusOf(ctx, group, machine)
  if (!status) return undefined
  return status.muted ? sideNote(status.text) : badge(status.tone, status.text)
}

export const pcRow = (ctx: PickerContext, group: ProjectGroup, machine: Machine, selected: boolean, choose: () => void, context: ContextMenu) =>
  machineRow(ctx.kit, machine, {
    selected,
    end: tag(ctx, group, machine),
    choose,
    menu: { context, spec: () => rowMenu(ctx, group, machine, choose) },
  })
