import type { ProjectLook } from '@sand/project/contract'
import { folderName } from '@sand/util'
import { projects } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export interface ProjectInfo {
  name: string
  key: string
  icon?: ProjectLook
  quick?: boolean
  root?: boolean
}

const plainPath = (path: string) => path.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase()

const samePath = (a: string, b: string) => plainPath(a) === plainPath(b)

export type ProjectLookup = (cwd: string, device: string, project?: string | null) => ProjectInfo

export const quickName = 'Quick thread'

export const quick = (device: string): ProjectInfo => ({ name: quickName, key: `${device}\0quick`, icon: { quick: true }, quick: true })

export const findGroup = (ctx: Context, cwd: string, device: string, project?: string | null) =>
  (project && ctx.get(projects)?.get(project)) || ctx.get(projects)?.group(cwd, device)

export const projectLookup =
  (ctx: Context): ProjectLookup =>
  (cwd, device, project) => {
    if (!cwd) return quick(device)
    const group = findGroup(ctx, cwd, device, project)
    if (group) {
      const root = group.locations.some(location => location.device === device && samePath(location.path, cwd))
      return { name: group.name || folderName(cwd), key: group.id, icon: ctx.get(projects)?.groupIcon(group), root }
    }
    return { name: folderName(cwd), key: `${device}\0${cwd}`, icon: ctx.get(projects)?.icon(cwd, device), root: true }
  }
