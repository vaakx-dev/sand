import type { PaletteItem } from '@sand/palette/contract'
import type { Thread } from '@sand/web-client/contract'
import { ago } from '@sand/dom'
import type { Context } from 'drydock'
import { visibleThreads } from '../items'
import { projectLookup, type ProjectLookup } from '../project-lookup'
import { machineName } from './places'

const projectName = (lookup: ProjectLookup, thread: Thread) => {
  const project = lookup(thread.info.cwd, thread.device, thread.info.project)
  return project.quick ? 'quick thread' : project.name
}

const detail = (ctx: Context, thread: Thread, lookup: ProjectLookup) =>
  [projectName(lookup, thread), machineName(ctx, thread.device), thread.info.pinned && 'pinned'].filter(Boolean).join(' · ')

const sessionItem = (ctx: Context<'threads'>, thread: Thread, group: string, lookup: ProjectLookup): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  icon: 'message',
  busy: thread.running,
  label: thread.info.title ?? 'Untitled thread',
  detail: detail(ctx, thread, lookup),
  meta: ago(thread.info.updated),
  search: `${thread.info.cwd} ${thread.id}`,
  run: () => ctx.threads.select(thread.id),
})

export const sessionItems = (ctx: Context<'threads'>, group: string) => {
  const lookup = projectLookup(ctx)
  return visibleThreads(ctx.threads.list())
    .filter(thread => thread.info.head)
    .map(thread => sessionItem(ctx, thread, group, lookup))
}
