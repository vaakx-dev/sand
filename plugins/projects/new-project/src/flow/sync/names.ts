import type { ProjectRef } from '@sand/host-projects/contract'
import type { ProjectsContext } from '../../context'
import { leafName } from '../paths'

export const placed = (ctx: ProjectsContext, ref: ProjectRef) => `${ctx.machines.name(ref.device)} · ${ref.path}`

export const projectName = (ctx: ProjectsContext, ref: ProjectRef) =>
  ctx.projects.group(ref.path, ref.device)?.name ?? leafName(ref.path, ctx.projects.place(ref.device).sep)

export const otherPcName = (ctx: ProjectsContext, ref: ProjectRef) => {
  const others = ctx.projects.group(ref.path, ref.device)?.locations.filter(location => location.device !== ref.device) ?? []
  const latest = others.sort((a, b) => b.updated - a.updated)[0]
  return latest ? ctx.machines.name(latest.device) : 'the other PC'
}
