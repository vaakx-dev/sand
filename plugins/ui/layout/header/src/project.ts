import { quickThreadIcon } from '@sand/dom'
import { folderName, isInside } from '@sand/kit'
import type { Context } from 'drydock'

export const quickName = 'Quick thread'

export const isQuick = (ctx: Context, cwd: string | undefined) => {
  if (cwd === undefined || !ctx.projects) return false
  const { scratch } = ctx.projects.place(ctx.threads?.device())
  return !cwd || (Boolean(scratch) && isInside(cwd, scratch))
}

const homeOf = (ctx: Context, cwd: string) => ctx.worktrees?.of(cwd, ctx.threads?.device())?.main ?? cwd

export const projectName = (ctx: Context, cwd: string | undefined) => {
  if (isQuick(ctx, cwd)) return quickName
  if (!cwd) return ''
  const home = homeOf(ctx, cwd)
  return ctx.projects?.group(home, ctx.threads?.device())?.name || folderName(home)
}

export const projectIconUrl = (ctx: Context, cwd: string | undefined) => {
  if (isQuick(ctx, cwd)) return quickThreadIcon
  if (!cwd || !ctx.projects) return ''
  const device = ctx.threads?.device()
  const home = homeOf(ctx, cwd)
  const group = ctx.projects.group(home, device)
  const locations = group?.locations ?? []
  return ctx.projects.icon(home, device) ?? locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean) ?? ''
}
