import { tildeHome } from '@sand/dom'
import type { Machine, ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from './types'

export const shorten = (ctx: ProjectsContext, path: string, device?: string) => {
  const { home, sep } = ctx.projects.place(device)
  if (home && path === home) return '~'
  if (home && path.startsWith(home + sep)) return `~${path.slice(home.length)}`
  return tildeHome(path)
}

export const expand = (ctx: ProjectsContext, path: string, device?: string) => {
  const { home, sep } = ctx.projects.place(device)
  const text = path.trim()
  if (text === '~') return home
  return home && text.startsWith(`~${sep}`) ? home + text.slice(1) : text
}

export const isOnline = (ctx: ProjectsContext, device?: string) => Boolean(ctx.machines.get(device)?.online)

export const machineName = (ctx: ProjectsContext, device?: string) => ctx.machines.get(device)?.name ?? 'Unknown PC'

export const machineKey = (machine: Machine) => (machine.local ? undefined : machine.id)

export const withoutCopy = (ctx: ProjectsContext, group: ProjectGroup) =>
  ctx.machines.list().filter(machine => !group.locations.some(entry => (entry.device ?? '') === (machineKey(machine) ?? '')))

export const byRecent = (locations: ProjectEntry[]) => [...locations].sort((a, b) => b.updated - a.updated)
