import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine, ProjectGroup, Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { groupOf } from './group'

export type PickerContext = Context<'composer' | 'threads' | 'projects' | 'machines'>

export interface Target {
  cwd: string
  device?: string
  thread?: Thread
  group?: ProjectGroup
}

export const deviceOf = (machine: Machine) => (machine.local ? undefined : machine.id)

export const refOf = (entry: ProjectRef): ProjectRef => ({ path: entry.path, device: entry.device })

export const hasMessages = (thread?: Thread) => Boolean(thread && (thread.info.messages > 0 || thread.entries.size > 0))

export const currentTarget = (ctx: PickerContext): Target => {
  const thread = ctx.threads.current()
  const cwd = thread ? thread.info.cwd : ctx.threads.cwd()
  const device = ctx.threads.device()
  return { cwd, device, thread, group: groupOf(ctx.projects, cwd, device, thread?.info.project) }
}

export const isOnline = (ctx: PickerContext, device?: string) => ctx.machines.get(device)?.online ?? false
