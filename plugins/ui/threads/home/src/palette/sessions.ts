import { threadOwners } from '@sand/chat/contract'
import type { PaletteItem } from '@sand/palette/contract'
import type { Shell } from '@sand/ui-shell/contract'
import { ago } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { visibleThreads } from '../items/items'
import { projectLookup, quickName, type ProjectLookup } from '../items/lookup'
import { openThread } from '../owners'
import { awayPcName } from './places'

const projectName = (lookup: ProjectLookup, thread: Thread) => (thread.info.kind === 'quick' ? quickName : lookup(thread.info.cwd, thread.device, thread.info.project).name)

const detail = (ctx: Context, thread: Thread, project: string | false) => [ctx.get(threadOwners)?.owner(thread.id)?.label, project, awayPcName(ctx, thread.device), thread.info.pinned && 'pinned'].filter(Boolean).join(' · ')

const sessionItem = (ctx: Context, shell: Shell, thread: Thread, group: string, project: string, mixed: boolean): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  busy: thread.running,
  icon: 'message',
  label: thread.info.title || 'Untitled thread',
  detail: detail(ctx, thread, mixed && project),
  meta: ago(thread.info.updated),
  search: `${project} ${thread.info.cwd} ${thread.id}`,
  run: () => openThread(ctx, shell, thread.id),
})

export const sessionItems = (ctx: Context, shell: Shell, threads: Threads, group: string) => {
  const lookup = projectLookup(ctx)
  const shown = visibleThreads(threads.list()).filter(thread => thread.info.head)
  const names = shown.map(thread => projectName(lookup, thread))
  const mixed = new Set(names).size > 1
  return shown.map((thread, index) => sessionItem(ctx, shell, thread, group, names[index] ?? '', mixed))
}
