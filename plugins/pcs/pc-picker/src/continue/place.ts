import type { ProjectRef } from '@sand/host-projects/contract'
import type { Machine, ProjectEntry, ProjectGroup, Thread } from '@sand/web-client/contract'
import { isInside } from '@sand/kit'
import { foldersFor as movedFolders } from '@sand/sessions-ui/move'
import type { Context } from 'drydock'
import { copyOn, groupOf } from '../group'

type Destination =
  | { kind: 'scratch' }
  | { kind: 'copy'; from?: ProjectEntry; to: ProjectEntry; folders: string[]; project: string }
  | { kind: 'nocopy'; group: ProjectGroup }
  | { kind: 'folder'; folders: string[] }

type PlaceContext = Context<'projects'>

export const foldersFor = (ctx: PlaceContext, cwd: string, to: ProjectRef, from?: ProjectRef) =>
  movedFolders(cwd, to.path, ctx.projects.place(to.device).sep, from?.path)

export const planDestination = (ctx: PlaceContext, thread: Thread, target: Machine): Destination => {
  const cwd = thread.info.cwd
  if (isInside(cwd, ctx.projects.place(thread.device).scratch)) return { kind: 'scratch' }
  const group = groupOf(ctx.projects, cwd, thread.device, thread.info.project)
  if (!group) return { kind: 'folder', folders: [cwd] }
  const to = copyOn(group, target.id)
  if (!to) return { kind: 'nocopy', group }
  const from = copyOn(group, thread.device)
  return { kind: 'copy', from, to, folders: foldersFor(ctx, cwd, to, from), project: group.id }
}
