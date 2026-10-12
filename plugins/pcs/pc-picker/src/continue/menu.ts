import type { Machine, ProjectGroup, Thread } from '@sand/web-client/contract'
import { div, span } from '@vaakx-dev/vrui'
import { copyOn, groupOf } from '../group'
import { machineList, machineRow, offlineNote, sideNote } from '../rows'
import type { PickerContext } from '../target'
import { blockedReason, continueOn, type ContinueContext } from './flow'

const destination = (group: ProjectGroup | undefined, machine: Machine) => {
  if (!group) return undefined
  return copyOn(group, machine.device)?.path ?? 'No copy yet, clone or sync first'
}

const machineLines = (machine: Machine, line?: string) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col' },
    div({ class: 'flex min-w-0 items-baseline gap-2' }, span({ class: 'truncate font-medium' }, machine.name), machine.local ? sideNote('this PC') : null),
    line ? span({ class: 'truncate text-xs text-neutral-500', title: line }, line) : null,
  )

export const continueMenu = (ctx: PickerContext & ContinueContext, thread: Thread, close: () => void) => {
  const home = ctx.machines.get(thread.device)
  const reason = blockedReason(thread)
  const group = groupOf(ctx.projects, thread.info.cwd, thread.device, thread.info.project)
  const rows = ctx.machines.list().map(machine => {
    const here = machine.id === home?.id
    return machineRow(ctx.kit, machine, {
      selected: here,
      disabled: here || Boolean(reason) || !machine.online,
      label: machineLines(machine, here ? undefined : destination(group, machine)),
      end: here ? sideNote('runs here') : offlineNote(machine),
      choose: () => {
        close()
        void continueOn(ctx, thread, machine)
      },
    })
  })
  return machineList(ctx.kit, 'Continue this thread on', rows, reason ? div({ class: 'px-3 pb-2 text-xs text-neutral-500' }, reason) : null)
}
