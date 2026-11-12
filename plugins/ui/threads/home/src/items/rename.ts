import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const canRename = (ctx: Context) => Boolean(ctx.get(picker))

export const renameThread = async (ctx: Context, threads: Threads, thread: Thread) => {
  const name = oneLine((await ctx.get(picker)?.input('Rename thread', thread.info.title)) ?? '')
  if (name && name !== thread.info.title) await threads.update(thread.id, { title: name })
}
