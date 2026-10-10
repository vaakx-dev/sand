import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import type { ContinueContext } from './flow'

export const ensureCopy = (ctx: ContinueContext, group: ProjectGroup, target: Machine, then: (to: ProjectRef) => void) => {
  if (!ctx.syncFlows) return false
  ctx.notify?.push(`${group.name} isn't on ${target.name} yet`)
  ctx.syncFlows.copy(group, target.device, to => then(to))
  return true
}
