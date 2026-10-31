import type { ProjectLook } from '@sand/project/contract'
import { folderName } from '@sand/util'
import { projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const quickName = 'Quick thread'

export interface Place {
  cwd: string
  device: string
  quick: boolean
  project?: string | null
}

export const currentPlace = (ctx: Context): Place | undefined => {
  const chats = ctx.get(threads)
  const chat = chats?.current()
  const quick = chat ? chat.info.kind === 'quick' : !chats?.cwd()
  return chats && { cwd: chats.cwd(), device: chats.device(), quick, project: chat?.info.project }
}

const groupOf = (ctx: Context, { cwd, device, project }: Place) => {
  const found = ctx.get(projects)
  return (project && found?.get(project)) || found?.group(cwd, device)
}

export const projectName = (ctx: Context, place: Place | undefined) => {
  if (place?.quick) return quickName
  if (!place?.cwd) return ''
  return groupOf(ctx, place)?.name || (ctx.get(projects)?.name(place.cwd, place.device) ?? folderName(place.cwd))
}

export const projectLook = (ctx: Context, place: Place | undefined): ProjectLook | undefined => {
  if (place?.quick) return { quick: true }
  if (!place?.cwd) return undefined
  const group = groupOf(ctx, place)
  return group ? ctx.get(projects)?.groupIcon(group) : ctx.get(projects)?.icon(place.cwd, place.device)
}

export const threadTitle = (ctx: Context) => {
  const thread = ctx.get(threads)?.current()
  if (!thread) return 'New thread'
  return thread.info.title || (thread.info.kind === 'quick' ? quickName : 'Untitled thread')
}
