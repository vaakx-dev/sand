import { folderName } from '@sand/kit'
import type { ProjectLook } from '@sand/protocol'
import type { Context } from 'drydock'

export const quickName = 'Quick thread'

export const isQuick = (ctx: Context, cwd: string | undefined) => cwd !== undefined && Boolean(ctx.projects?.quick(cwd, ctx.threads?.device()))

const homeOf = (ctx: Context, cwd: string) => ctx.worktrees?.of(cwd, ctx.threads?.device())?.main ?? cwd

export const projectName = (ctx: Context, cwd: string | undefined) => {
  if (isQuick(ctx, cwd)) return quickName
  if (!cwd) return ''
  const home = homeOf(ctx, cwd)
  return ctx.projects?.name(home, ctx.threads?.device()) ?? folderName(home)
}

export const projectLook = (ctx: Context, cwd: string | undefined): ProjectLook | undefined => {
  if (isQuick(ctx, cwd)) return { quick: true }
  if (!cwd) return undefined
  return ctx.projects?.icon(homeOf(ctx, cwd), ctx.threads?.device())
}
