import type { UserContent } from '@sand/messages'
import type { Context } from 'drydock'
import type { Files } from '../attachments/files'

const same = (left: UserContent[], right: UserContent[]) => left.length === right.length && left.every((item, index) => item === right[index])

export const inlineFiles = async (ctx: Context<'threads'>, files: Files, items: UserContent[], current: () => boolean) => {
  if (!ctx.media || !items.length) return
  const inlined = await ctx.media.inline(items, ctx.threads.current()?.id).catch(() => items)
  if (current() && same(files.contents(), items) && !same(inlined, items)) files.set(inlined)
}
