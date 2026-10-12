import type { ContextMenu } from '@sand/ui-kit/contract'
import type { Machine } from '@sand/web-client/contract'
import { choosePc } from './choose'
import { machineList, machineRow, offlineNote, pcRow } from './rows'
import { currentTarget, type PickerContext } from './target'

const startQuick = async (ctx: PickerContext, machine: Machine) => {
  if (!machine.online) return
  await ctx.threads.draft('', machine.id, ctx.threads.drafting()?.id)
  ctx.composer.focus()
}

const quickMenu = (ctx: PickerContext, cwd: string, device: string, close: () => void) => {
  const inFolder = Boolean(cwd) && !ctx.projects.quick(cwd, device)
  const rows = ctx.machines.list().map(machine => {
    const here = machine.id === device
    const choose = () => {
      close()
      if (!here) void startQuick(ctx, machine)
    }
    return machineRow(ctx.kit, machine, { selected: here, end: offlineNote(machine), choose })
  })
  return machineList(ctx.kit, inFolder ? 'Run on' : 'Start a quick thread on', rows)
}

export const pcMenu = (ctx: PickerContext, close: () => void, context: ContextMenu) => {
  const { group, device, cwd } = currentTarget(ctx)
  if (!group) return quickMenu(ctx, cwd, device, close)
  const rows = ctx.machines.list().map(machine => {
    const choose = () => {
      close()
      void choosePc(ctx, group, machine)
    }
    return pcRow(ctx, group, machine, machine.id === device, choose, context)
  })
  return machineList(ctx.kit, `Run ${group.name} on`, rows)
}
