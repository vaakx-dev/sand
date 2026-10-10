import { quickThreadIcon } from '@sand/dom'
import { folderName } from '@sand/kit'
import type { Context } from 'drydock'

export interface ProjectInfo {
  name: string
  key: string
  icon?: string
  quick?: boolean
}

export type ProjectLookup = (cwd: string, device?: string, project?: string | null) => ProjectInfo

export const sameDevice = (a?: string, b?: string) => (a || undefined) === (b || undefined)

export const isQuick = (ctx: Context, cwd: string, device?: string) => ctx.projects?.quick(cwd, device) ?? !cwd

export const findGroup = (ctx: Context, cwd: string, device?: string, project?: string | null) =>
  (project && ctx.projects?.get(project)) || ctx.projects?.group(cwd, device)

const quick = (device?: string): ProjectInfo => ({ name: 'Quick thread', key: `${device ?? ''}\0quick`, icon: quickThreadIcon, quick: true })

export const projectLookup =
  (ctx: Context): ProjectLookup =>
  (cwd, device, project) => {
    if (!project && isQuick(ctx, cwd, device)) return quick(device)
    const group = findGroup(ctx, cwd, device, project)
    if (group) return { name: group.name || folderName(cwd), key: group.id, icon: ctx.projects?.groupIcon(group) }
    if (isQuick(ctx, cwd, device)) return quick(device)
    return { name: folderName(cwd), key: `${device ?? ''}\0${cwd}`, icon: ctx.projects?.icon(cwd, device) }
  }
