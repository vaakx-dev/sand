import type { Machine, ProjectEntry, ProjectGroup, ProjectRef, Thread } from '@sand/protocol'
import type { Context } from 'drydock'

export type PickerContext = Context<'composer' | 'threads' | 'projects' | 'machines'>

export interface Target {
  cwd: string
  device?: string
  thread?: Thread
  group?: ProjectGroup
}

export const deviceOf = (machine: Machine) => (machine.local ? undefined : machine.id)

export const refOf = (entry: ProjectEntry): ProjectRef => ({ path: entry.path, device: entry.device })

export const locationOn = (group: ProjectGroup, device?: string) => group.locations.find(entry => entry.device === device)

export const hasMessages = (thread?: Thread) => Boolean(thread && (thread.info.messages > 0 || thread.entries.size > 0))

export const currentTarget = (ctx: PickerContext): Target => {
  const thread = ctx.threads.current()
  const cwd = thread ? thread.info.cwd : ctx.threads.cwd()
  const device = ctx.threads.device()
  return { cwd, device, thread, group: ctx.projects.group(cwd, device) }
}

export const isOnline = (ctx: PickerContext, device?: string) => ctx.machines.get(device)?.online ?? false
