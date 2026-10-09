import type { ProjectRef } from '@sand/protocol'
import { leafName } from '../paths'
import type { FlowContext } from '../types'

export const pcName = (ctx: FlowContext, device?: string) => ctx.machines.get(device)?.name ?? device ?? 'This PC'

export const placed = (ctx: FlowContext, ref: ProjectRef) => `${pcName(ctx, ref.device)} · ${ref.path}`

export const projectName = (ctx: FlowContext, ref: ProjectRef) =>
  ctx.projects.group(ref.path, ref.device)?.name ?? leafName(ref.path, ctx.projects.place(ref.device).sep)

export const otherPcName = (ctx: FlowContext, ref: ProjectRef) => {
  const others = ctx.projects.group(ref.path, ref.device)?.locations.filter(location => location.device !== ref.device) ?? []
  const latest = others.sort((a, b) => b.updated - a.updated)[0]
  return latest ? pcName(ctx, latest.device) : 'the other PC'
}
