import { errorMessage } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/protocol'
import { newerSource } from './status'
import { deviceOf, locationOn, refOf, type PickerContext } from './target'

const sendFirst = async (ctx: PickerContext, group: ProjectGroup, machine: Machine) => {
  const location = locationOn(group, deviceOf(machine))
  const source = location && newerSource(ctx, group, location)
  if (!location || !source || !ctx.sync) return true
  ctx.notify?.push(`Sending the newer work from ${source.machine.name} to ${machine.name} first`)
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
  const location = locationOn(group, device)
  if (!location) return ctx.syncFlows?.copy(group, device)
  if (!(await sendFirst(ctx, group, machine))) return
  await ctx.threads.draft(location.path, location.device)
  ctx.composer.focus()
}
