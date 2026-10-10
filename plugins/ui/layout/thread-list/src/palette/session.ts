import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { Thread } from '@sand/web-client/contract'
import { copyWithNotice } from '@sand/dom'
import { oneLine } from '@sand/kit'
import type { Context } from 'drydock'

export const renamePage = (ctx: Context<'threads'>, thread: Thread): PalettePage => ({
  id: 'rename',
  title: 'Rename thread',
  field: {
    kind: 'text',
    value: thread.info.title ?? '',
    placeholder: 'Thread name',
    action: value => ({ label: 'Save', enabled: Boolean(value.trim()) && value.trim() !== thread.info.title }),
    async submit(value) {
      const name = oneLine(value)
      await ctx.threads.rename(thread.id, name)
      ctx.notify?.push(`Renamed to ${name}`)
    },
  },
})

const command = (ctx: Context, name: string) => () => void ctx.commands?.run(name)

export const sessionActions = (ctx: Context<'threads'>, thread: Thread) => {
  const group = 'This thread'
  const items: PaletteItem[] = [{ id: 'command:name', group, icon: 'pencil', label: 'Rename thread', detail: thread.info.title ?? 'Untitled thread', page: () => renamePage(ctx, thread) }]
  if (ctx.commands?.get('fork')) items.push({ id: 'command:fork', group, icon: 'fork', label: 'Fork from an earlier message', run: command(ctx, 'fork') })
  if (ctx.commands?.get('model')) items.push({ id: 'command:model', group, icon: 'bot', label: 'Switch model', detail: ctx.models?.describe(thread.id), run: command(ctx, 'model') })
  items.push({
    id: 'session:copy-id',
    group,
    icon: 'copy',
    label: 'Copy thread ID',
    detail: thread.id,
    search: 'copy thread id reference',
    run: () => copyWithNotice(ctx.notify, thread.id, 'thread ID'),
  })
  return items
}
