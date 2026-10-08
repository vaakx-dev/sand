import type { ProjectGroup, ProjectRef } from '@sand/protocol'
import type { FlowContext } from '../types'

export const copySource = (ctx: FlowContext, group: ProjectGroup): ProjectRef | undefined => {
  const online = group.locations.filter(location => ctx.machines.get(location.device)?.online)
  const latest = online.sort((a, b) => b.updated - a.updated)[0]
  return latest && { path: latest.path, device: latest.device }
}
