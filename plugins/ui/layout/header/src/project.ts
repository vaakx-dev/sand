import { quickThreadIcon } from '@sand/dom'
import { folderName, isInside } from '@sand/kit'
import type { Context } from 'drydock'

export const quickName = 'Quick thread'

export const isQuick = (ctx: Context, cwd: string | undefined) => {
  if (cwd === undefined || !ctx.projects) return false
  const { scratch } = ctx.projects.place(ctx.threads?.device())
  return !cwd || (Boolean(scratch) && isInside(cwd, scratch))
}

export const projectName = (ctx: Context, cwd: string | undefined) => {
  if (isQuick(ctx, cwd)) return quickName
  if (!cwd) return ''
  return ctx.projects?.group(cwd, ctx.threads?.device())?.name || folderName(cwd)
}

export const projectIconUrl = (ctx: Context, cwd: string | undefined) => {
  if (isQuick(ctx, cwd)) return quickThreadIcon
  if (!cwd || !ctx.projects) return ''
  const device = ctx.threads?.device()
  const group = ctx.projects.group(cwd, device)
  const locations = group?.locations ?? []
  return ctx.projects.icon(cwd, device) ?? locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean) ?? ''
}
