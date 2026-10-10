import type { ProjectRef } from '@sand/host-projects/contract'
import { leafName } from '../paths'
import type { FlowContext } from '../types'

export const placed = (ctx: FlowContext, ref: ProjectRef) => `${ctx.machines.name(ref.device)} · ${ref.path}`

export const projectName = (ctx: FlowContext, ref: ProjectRef) =>
  ctx.projects.group(ref.path, ref.device)?.name ?? leafName(ref.path, ctx.projects.place(ref.device).sep)

export const otherPcName = (ctx: FlowContext, ref: ProjectRef) => {
  const others = ctx.projects.group(ref.path, ref.device)?.locations.filter(location => location.device !== ref.device) ?? []
  const latest = others.sort((a, b) => b.updated - a.updated)[0]
  return latest ? ctx.machines.name(latest.device) : 'the other PC'
}
