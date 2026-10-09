import { div, groupLabel, menuItem, span } from '@sand/dom'
import type { Machine, ProjectGroup, Thread } from '@sand/web-client/contract'
import { copyOn, groupOf } from '../group'
import { machineIcon } from '../rows'
import { deviceOf, type PickerContext } from '../target'
import { blockedReason, continueOn, type ContinueContext } from './flow'

const note = (text: string) => span({ class: 'shrink-0 text-xs text-neutral-500' }, text)

const destination = (group: ProjectGroup | undefined, machine: Machine) => {
  if (!group) return undefined
  return copyOn(group, deviceOf(machine))?.path ?? 'No copy yet, clone or sync first'
}

const continueRow = (machine: Machine, home: boolean, blocked: boolean, line: string | undefined, choose: () => void) =>
  menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(home),
      active: home,
      disabled: home || blocked || !machine.online,
      class: 'py-2 hover:bg-neutral-700',
      onClick: choose,
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, machineIcon(machine)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-baseline gap-2' },
        span({ class: 'truncate font-medium' }, machine.name),
        machine.local && note('this PC'),
      ),
      line && span({ class: 'truncate text-xs text-neutral-500', title: line }, line),
    ),
    home ? note('runs here') : !machine.online && note('Offline'),
  )

export const continueMenu = (ctx: PickerContext & ContinueContext, thread: Thread, close: () => void) => {
  const home = ctx.machines.get(thread.device)
  const reason = blockedReason(thread)
  const group = groupOf(ctx.projects, thread.info.cwd, thread.device, thread.info.project)
  return div(
    { class: 'flex flex-col pb-1' },
    groupLabel('Continue this thread on'),
    reason && div({ class: 'px-3 pb-2 text-xs text-neutral-500' }, reason),
    div(
      { class: 'flex flex-col gap-1 px-1' },
      ...ctx.machines.list().map(machine => {
        const here = machine.id === home?.id
        return continueRow(machine, here, Boolean(reason), here ? undefined : destination(group, machine), () => {
          close()
          void continueOn(ctx, thread, machine)
        })
      }),
    ),
  )
}
