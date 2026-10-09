import type { ProjectGroup } from '@sand/protocol'
import { folderName, isInside } from '@sand/kit'
import type { Context } from 'drydock'

export interface ProjectInfo {
  name: string
  key: string
  icon?: string
  quick?: boolean
}

export type ProjectLookup = (cwd: string, device?: string, project?: string | null) => ProjectInfo

export const sameDevice = (a?: string, b?: string) => (a || undefined) === (b || undefined)

export const isQuick = (ctx: Context, cwd: string, device?: string) => !cwd || isInside(cwd, ctx.projects?.place(device).scratch ?? '')

export const findGroup = (ctx: Context, cwd: string, device?: string, project?: string | null) =>
  (project && ctx.projects?.get(project)) || ctx.projects?.group(cwd, device)

export const groupIcon = (ctx: Context, group: ProjectGroup, device?: string) => {
  const here = group.locations.find(location => sameDevice(location.device, device))
  return [...(here ? [here] : []), ...group.locations].map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean)
}

const quick = (device?: string): ProjectInfo => ({ name: 'Quick threads', key: `${device ?? ''}\0quick`, quick: true })

export const projectLookup =
  (ctx: Context): ProjectLookup =>
  (cwd, device, project) => {
    if (!project && isQuick(ctx, cwd, device)) return quick(device)
    const group = findGroup(ctx, cwd, device, project)
    if (group) return { name: group.name || folderName(cwd), key: group.id, icon: groupIcon(ctx, group, device) }
    if (isQuick(ctx, cwd, device)) return quick(device)
    return { name: folderName(cwd), key: `${device ?? ''}\0${cwd}`, icon: ctx.projects?.icon(cwd, device) }
  }
