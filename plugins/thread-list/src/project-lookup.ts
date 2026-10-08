import { folderName } from '@sand/kit'
import type { Context } from 'drydock'

export interface ProjectInfo {
  name: string
  key: string
  icon?: string
}

export type ProjectLookup = (cwd: string, device?: string) => ProjectInfo

export const projectLookup =
  (ctx: Context): ProjectLookup =>
  (cwd, device) => {
    const group = ctx.projects?.group(cwd, device)
    if (!group) return { name: folderName(cwd), key: `${device ?? ''}\0${cwd}`, icon: ctx.projects?.icon(cwd, device) }
    const here = ctx.projects?.icon(cwd, device)
    const icon = here ?? group.locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean)
    return { name: group.name || folderName(cwd), key: group.id, icon }
  }
