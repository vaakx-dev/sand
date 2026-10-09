import type { Skill } from './contract'
import type {} from '@sand/paths/contract'
import type {} from '@sand/watch/contract'
import type { Context } from 'drydock'
import { join } from 'node:path'
import { discover } from './discover'

export const merge = (global: Skill[], project: Skill[]) => {
  const byName = new Map(global.map(skill => [skill.name, skill]))
  for (const skill of project) byName.set(skill.name, skill)
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const projectSkills = (ctx: Context<'paths' | 'watcher'>, globalRoots: string[], changed: () => void) => {
  const folders = ctx.watcher.folders(dir => discover(new Map(), [dir], error => ctx.report(error)), [] as Skill[], changed)
  ctx.effect(() => folders.close)
  return (cwd: string, project?: string | null): Promise<Skill[]> => {
    const dir = join(ctx.paths.projectFolder(cwd, project), '.sand', 'skills')
    return globalRoots.includes(dir) ? Promise.resolve([]) : folders.get(dir)
  }
}
