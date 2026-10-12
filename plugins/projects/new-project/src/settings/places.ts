import { tildeHome } from '@sand/kit'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'

export const shorten = (ctx: ProjectsContext, path: string, device: string) => {
  const { home, sep } = ctx.projects.place(device)
  if (home && path === home) return '~'
  if (home && path.startsWith(home + sep)) return `~${path.slice(home.length)}`
  return tildeHome(path)
}

export const expand = (ctx: ProjectsContext, path: string, device: string) => {
  const { home, sep } = ctx.projects.place(device)
  const text = path.trim()
  if (text === '~') return home
  return home && text.startsWith(`~${sep}`) ? home + text.slice(1) : text
}

export const withoutCopy = (ctx: ProjectsContext, group: ProjectGroup) =>
  ctx.machines.list().filter(machine => !group.locations.some(entry => entry.device === machine.id))

export const byRecent = (locations: ProjectEntry[]) => [...locations].sort((a, b) => b.updated - a.updated)
