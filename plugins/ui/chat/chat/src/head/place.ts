import type { ProjectLook } from '@sand/project/contract'
import { folderName } from '@sand/util'
import { projects, type Thread } from '@sand/web-client/contract'
import type { ChatContext } from '../context'

export interface Place {
  cwd: string
  device: string
  quick: boolean
  project?: string | null
}

export const placeOf = (ctx: ChatContext, thread: Thread | undefined): Place | undefined => {
  if (thread) return { cwd: thread.info.cwd, device: thread.device, quick: thread.info.kind === 'quick', project: thread.info.project }
  const draft = ctx.threads.drafting()
  return draft && { cwd: draft.cwd, device: draft.device, quick: !draft.cwd }
}

const groupOf = (ctx: ChatContext, { cwd, device, project }: Place) => {
  const found = ctx.get(projects)
  return (project && found?.get(project)) || found?.group(cwd, device)
}

export const projectName = (ctx: ChatContext, place: Place) => {
  if (!place.cwd) return ''
  return groupOf(ctx, place)?.name || (ctx.get(projects)?.name(place.cwd, place.device) ?? folderName(place.cwd))
}

export const projectLook = (ctx: ChatContext, place: Place): ProjectLook | undefined => {
  const group = groupOf(ctx, place)
  return group ? ctx.get(projects)?.groupIcon(group) : ctx.get(projects)?.icon(place.cwd, place.device)
}

export const threadTitle = (thread: Thread | undefined) => {
  if (!thread) return 'New thread'
  return thread.info.title || 'Untitled thread'
}
