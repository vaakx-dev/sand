import type { PaletteItem } from '@sand/palette/contract'
import { ago } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { visibleThreads } from '../items/items'
import { projectLookup, quickName, type ProjectLookup } from '../items/lookup'
import { machineName } from './places'

const projectName = (lookup: ProjectLookup, thread: Thread) => (thread.info.kind === 'quick' ? quickName : lookup(thread.info.cwd, thread.device, thread.info.project).name)

const detail = (ctx: Context, thread: Thread, lookup: ProjectLookup) =>
  [projectName(lookup, thread), machineName(ctx, thread.device), thread.info.pinned && 'pinned'].filter(Boolean).join(' · ')

const sessionItem = (ctx: Context, threads: Threads, thread: Thread, group: string, lookup: ProjectLookup): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  icon: 'message',
  busy: thread.running,
  label: thread.info.title || 'Untitled thread',
  detail: detail(ctx, thread, lookup),
  meta: ago(thread.info.updated),
  search: `${thread.info.cwd} ${thread.id}`,
  run: () => threads.select(thread.id),
})

export const sessionItems = (ctx: Context, threads: Threads, group: string) => {
  const lookup = projectLookup(ctx)
  return visibleThreads(threads.list())
    .filter(thread => thread.info.head)
    .map(thread => sessionItem(ctx, threads, thread, group, lookup))
}
