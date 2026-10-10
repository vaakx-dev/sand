import { div, groupLabel } from '@sand/dom'
import { isInside } from '@sand/kit'
import type { Machine } from '@sand/web-client/contract'
import { choosePc } from './choose'
import { pcRow, quickRow } from './rows'
import { currentTarget, deviceOf, type PickerContext } from './target'

const startQuick = async (ctx: PickerContext, machine: Machine) => {
  if (!machine.online) return
  await ctx.threads.draft('', deviceOf(machine), ctx.threads.drafting()?.id)
  ctx.composer.focus()
}

const isQuick = (ctx: PickerContext, cwd: string, device?: string) => !cwd || isInside(cwd, ctx.projects.place(device).scratch)

const quickMenu = (ctx: PickerContext, cwd: string, device: string | undefined, close: () => void) => {
  const folder = isQuick(ctx, cwd, device) ? undefined : cwd
  return div(
    { class: 'flex flex-col pb-1' },
    groupLabel(folder ? 'Run on' : 'Start a quick thread on'),
    div(
      { class: 'flex flex-col gap-1 px-1' },
      ...ctx.machines.list().map(machine => {
        const here = deviceOf(machine) === device
        const choose = () => {
          close()
          if (!here) void startQuick(ctx, machine)
        }
        return quickRow(machine, here, choose, here && folder ? folder : 'Quick thread')
      }),
    ),
  )
}

export const pcMenu = (ctx: PickerContext, close: () => void) => {
  const { group, device, cwd } = currentTarget(ctx)
  if (!group) return quickMenu(ctx, cwd, device, close)
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
