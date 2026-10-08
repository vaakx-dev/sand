import { div, groupLabel } from '@sand/dom'
import { choosePc } from './choose'
import { pcRow } from './rows'
import { currentTarget, deviceOf, type PickerContext } from './target'

export const pcMenu = (ctx: PickerContext, close: () => void) => {
  const { group, device } = currentTarget(ctx)
  if (!group) return div({ class: 'px-3 py-4 text-xs text-neutral-500' }, 'This folder is not a saved project yet.')
  return div(
    { class: 'flex flex-col pb-1' },
    groupLabel(`Run ${group.name} on`),
    div(
      { class: 'flex flex-col gap-1 px-1' },
      ...ctx.machines.list().map(machine =>
        pcRow(ctx, group, machine, deviceOf(machine) === device, () => {
          close()
          void choosePc(ctx, group, machine)
        }),
      ),
    ),
  )
}
