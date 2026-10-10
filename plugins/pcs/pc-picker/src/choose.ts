import { errorMessage } from '@sand/dom'
import type { Machine, ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import { copyOn } from './group'
import { newerSource } from './status'
import { deviceOf, refOf, type PickerContext } from './target'

const sendFirst = async (ctx: PickerContext, group: ProjectGroup, machine: Machine, location: ProjectEntry) => {
  const source = newerSource(ctx, group, location)
  if (!source || !ctx.sync) return true
  ctx.notify?.push(`Sending the changes from ${source.machine.name} to ${machine.name}…`)
  try {
    const applied = await ctx.sync.send(refOf(source.entry), refOf(location))
    if (applied.result !== 'conflicts') return true
    ctx.syncFlows?.resolve(refOf(location))
    return false
  } catch (error) {
    ctx.notify?.push(errorMessage(error), { level: 'error' })
    return true
  }
}

export const choosePc = async (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  if (!machine.online) return
  const device = deviceOf(machine)
  const location = copyOn(group, device)
  if (!location) {
    if (ctx.syncFlows) return ctx.syncFlows.copy(group, device)
    return ctx.notify?.push(`${group.name} isn't on ${machine.name} yet`)
  }
  if (!(await sendFirst(ctx, group, machine, location))) return
  await ctx.threads.draft(location.path, location.device, ctx.threads.drafting()?.id)
  ctx.composer.focus()
}
