import type { ProjectLook } from '@sand/project/contract'
import { folderName } from '@sand/util'
import { projects, type Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { quickName } from '../contract'
import { chosen } from '../integrations/chosen'

export interface ProjectPick {
  id: string
  name: string
  path: string
  device: string
  icon?: ProjectLook
}

export const quickPick = (device: string): ProjectPick => ({ id: `${device}\0quick`, name: quickName, path: '', device, icon: { quick: true } })

export const projectPicks = (ctx: Context, device: string): ProjectPick[] => {
  const known = ctx.get(projects)
  return (known?.groups() ?? [])
    .flatMap(group => {
      const location = group.locations.find(found => found.device === device && !found.missing)
      return location ? [{ id: group.id, name: group.name || folderName(location.path), path: location.path, device, icon: known?.groupIcon(group) }] : []
    })
    .toSorted((a, b) => a.name.localeCompare(b.name))
}

export const currentPick = (ctx: Context, threads: Threads): ProjectPick => {
  const last = chosen.get() ?? { path: '', device: threads.device() }
  if (!last.path) return quickPick(last.device)
  return projectPicks(ctx, last.device).find(pick => pick.path === last.path) ?? quickPick(last.device)
}
