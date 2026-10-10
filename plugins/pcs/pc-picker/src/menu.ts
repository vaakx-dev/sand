import type { ContextMenu } from '@sand/dom'
import type { Machine } from '@sand/web-client/contract'
import { choosePc } from './choose'
import { machineList, pcRow, quickRow } from './rows'
import { currentTarget, type PickerContext } from './target'

const startQuick = async (ctx: PickerContext, machine: Machine) => {
  if (!machine.online) return
  await ctx.threads.draft('', machine.device, ctx.threads.drafting()?.id)
  ctx.composer.focus()
}

const quickMenu = (ctx: PickerContext, cwd: string, device: string | undefined, close: () => void) => {
  const folder = ctx.projects.quick(cwd, device) ? undefined : cwd
  const rows = ctx.machines.list().map(machine => {
    const here = machine.device === device
    const choose = () => {
      close()
      if (!here) void startQuick(ctx, machine)
    }
    return quickRow(machine, here, choose)
  })
  return machineList(folder ? 'Run on' : 'Start a quick thread on', rows)
}

export const pcMenu = (ctx: PickerContext, close: () => void, context: ContextMenu) => {
  const { group, device, cwd } = currentTarget(ctx)
  if (!group) return quickMenu(ctx, cwd, device, close)
  const rows = ctx.machines.list().map(machine => {
    const choose = () => {
      close()
      void choosePc(ctx, group, machine)
    }
    return pcRow(ctx, group, machine, machine.device === device, choose, context)
  })
  return machineList(`Run ${group.name} on`, rows)
}
