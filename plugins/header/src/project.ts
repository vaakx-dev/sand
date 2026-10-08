import { folderName } from '@sand/kit'
import type { Context } from 'drydock'

export const projectName = (ctx: Context, cwd: string | undefined) => {
  if (!cwd) return ''
  return ctx.projects?.group(cwd, ctx.threads?.device())?.name || folderName(cwd)
}

export const pcLabel = (ctx: Context, cwd: string | undefined) => {
  const device = ctx.threads?.device()
  const machine = ctx.machines?.get(device)
  if (device && !machine?.local) return machine?.name ?? 'Other PC'
  const shared = cwd && (ctx.projects?.group(cwd, device)?.locations.length ?? 0) > 1
  return shared ? (machine?.name ?? '') : ''
}

export const projectIconUrl = (ctx: Context, cwd: string | undefined) => {
  if (!cwd || !ctx.projects) return ''
  const device = ctx.threads?.device()
  const group = ctx.projects.group(cwd, device)
  const locations = group?.locations ?? []
  return ctx.projects.icon(cwd, device) ?? locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean) ?? ''
}
