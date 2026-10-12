import { folderName } from '@sand/kit'
import type { ProjectLook } from '@sand/protocol'
import type { Context } from 'drydock'

export const quickName = 'Quick thread'

export interface Place {
  cwd: string
  device: string
}

export const currentPlace = (ctx: Context): Place | undefined => {
  const threads = ctx.threads
  return threads && { cwd: threads.current()?.info.cwd ?? threads.cwd(), device: threads.device() }
}

export const isQuick = (ctx: Context, place: Place | undefined) => Boolean(place && ctx.projects?.quick(place.cwd, place.device))

const homeOf = (ctx: Context, { cwd, device }: Place) => ctx.worktrees?.of(cwd, device)?.main ?? cwd

export const projectName = (ctx: Context, place: Place | undefined) => {
  if (isQuick(ctx, place)) return quickName
  if (!place?.cwd) return ''
  const home = homeOf(ctx, place)
  return ctx.projects?.name(home, place.device) ?? folderName(home)
}

export const projectLook = (ctx: Context, place: Place | undefined): ProjectLook | undefined => {
  if (isQuick(ctx, place)) return { quick: true }
  if (!place?.cwd) return undefined
  return ctx.projects?.icon(homeOf(ctx, place), place.device)
}
