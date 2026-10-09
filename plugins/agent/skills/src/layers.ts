import type { Skill } from '@sand/protocol'
import type { Context } from 'drydock'
import { projectFolder, watchedFolders } from '@sand/host'
import { join } from 'node:path'
import { discover } from './discover'

export const merge = (global: Skill[], project: Skill[]) => {
  const byName = new Map(global.map(skill => [skill.name, skill]))
  for (const skill of project) byName.set(skill.name, skill)
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const projectSkills = (ctx: Context, globalRoots: string[], changed: () => void) => {
  const folders = watchedFolders(ctx, dir => discover(new Map(), [dir], error => ctx.report(error)), [] as Skill[], changed)
  return (cwd: string, project?: string | null): Promise<Skill[]> => {
    const dir = join(projectFolder(cwd, project), '.sand', 'skills')
    return globalRoots.includes(dir) ? Promise.resolve([]) : folders.get(dir)
  }
}
