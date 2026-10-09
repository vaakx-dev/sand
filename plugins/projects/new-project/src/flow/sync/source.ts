import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { FlowContext } from '../types'

export const copySources = (ctx: FlowContext, group: ProjectGroup, target?: string): ProjectEntry[] =>
  group.locations
    .filter(location => !location.missing && location.device !== target && ctx.machines.get(location.device)?.online)
    .sort((a, b) => b.updated - a.updated)

export const hasCopy = (group: ProjectGroup, device?: string) => group.locations.some(location => location.device === device && !location.missing)
