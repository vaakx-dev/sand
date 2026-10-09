import type { Machine, ProjectEntry, ProjectGroup, ProjectRef, Thread } from '@sand/protocol'
import { isInside } from '@sand/kit'
import type { Context } from 'drydock'
import { copyOn, groupOf } from '../group'
import { deviceOf } from '../target'

export type Destination =
  | { kind: 'scratch' }
  | { kind: 'copy'; group: ProjectGroup; from?: ProjectEntry; to: ProjectEntry; folders: string[]; project: string }
  | { kind: 'nocopy'; group: ProjectGroup }
  | { kind: 'folder'; folders: string[] }

type PlaceContext = Context<'projects'>

const mapInto = (ctx: PlaceContext, cwd: string, to: ProjectRef, from?: ProjectRef) => {
  if (!from || !isInside(cwd, from.path)) return to.path
  const parts = cwd.slice(from.path.replace(/[\\/]+$/, '').length).split(/[\\/]+/).filter(Boolean)
  const sep = ctx.projects.place(to.device).sep
  return [to.path.replace(/[\\/]+$/, ''), ...parts].join(sep)
}

export const foldersFor = (ctx: PlaceContext, cwd: string, to: ProjectRef, from?: ProjectRef) => [
  ...new Set([mapInto(ctx, cwd, to, from), to.path]),
]

export const planDestination = (ctx: PlaceContext, thread: Thread, target: Machine): Destination => {
  const cwd = thread.info.cwd
  if (isInside(cwd, ctx.projects.place(thread.device).scratch)) return { kind: 'scratch' }
  const group = groupOf(ctx.projects, cwd, thread.device, thread.info.project)
  if (!group) return { kind: 'folder', folders: [cwd] }
  const to = copyOn(group, deviceOf(target))
  if (!to) return { kind: 'nocopy', group }
  const from = copyOn(group, thread.device)
  return { kind: 'copy', group, from, to, folders: foldersFor(ctx, cwd, to, from), project: group.id }
}
