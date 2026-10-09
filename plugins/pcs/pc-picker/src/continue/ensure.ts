import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { deviceOf } from '../target'
import type { ContinueContext } from './flow'

export const ensureCopy = (ctx: ContinueContext, group: ProjectGroup, target: Machine, then: (to: ProjectRef) => void) => {
  if (!ctx.syncFlows) return false
  ctx.notify?.push(`${group.name} isn't on ${target.name} yet`)
  ctx.syncFlows.copy(group, deviceOf(target), to => then(to))
  return true
}
