import type { PaletteItem, Thread } from '@sand/protocol'
import { ago } from '@sand/dom'
import { folderName } from '@sand/kit'
import type { Context } from 'drydock'
import { visibleThreads } from '../items'
import { machineName } from './places'

const detail = (ctx: Context, thread: Thread) =>
  [folderName(thread.info.cwd), machineName(ctx, thread.device), thread.info.pinned && 'pinned'].filter(Boolean).join(' · ')

const sessionItem = (ctx: Context<'threads'>, thread: Thread, group: string): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  icon: 'message',
  busy: thread.running,
  label: thread.info.title ?? 'Untitled thread',
  detail: detail(ctx, thread),
  meta: ago(thread.info.updated),
  search: `${thread.info.cwd} ${thread.id}`,
  run: () => ctx.threads.select(thread.id),
})

export const sessionItems = (ctx: Context<'threads'>, group: string) =>
  visibleThreads(ctx.threads.list())
    .filter(thread => thread.info.head)
    .map(thread => sessionItem(ctx, thread, group))
