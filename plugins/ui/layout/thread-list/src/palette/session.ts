import type { PaletteItem, PalettePage, Thread } from '@sand/protocol'
import { copyText } from '@sand/dom'
import type { Context } from 'drydock'

const renamePage = (ctx: Context<'threads'>, thread: Thread): PalettePage => ({
  id: 'rename',
  title: 'Rename thread',
  field: {
    kind: 'text',
    value: thread.info.title ?? '',
    placeholder: 'Thread name',
    action: value => ({ label: 'Save', enabled: Boolean(value.trim()) && value.trim() !== thread.info.title }),
    async submit(value) {
      const name = value.replace(/\s+/g, ' ').trim()
      await ctx.threads.rename(thread.id, name)
      ctx.notify?.push(`Renamed to ${name}`)
    },
  },
})

const command = (ctx: Context, name: string) => () => void ctx.commands?.run(name)

export const sessionActions = (ctx: Context<'threads'>, thread: Thread): PaletteItem[] => [
  { id: 'command:name', group: 'This thread', icon: 'pencil', label: 'Rename thread', detail: thread.info.title ?? 'Untitled thread', page: () => renamePage(ctx, thread) },
  ...(ctx.commands?.get('fork') ? [{ id: 'command:fork', group: 'This thread', icon: 'fork', label: 'Fork from an earlier message', run: command(ctx, 'fork') }] : []),
  ...(ctx.commands?.get('model')
    ? [{ id: 'command:model', group: 'This thread', icon: 'bot', label: 'Switch model', detail: ctx.models?.describe(thread.id), run: command(ctx, 'model') }]
    : []),
  {
    id: 'session:copy-id',
    group: 'This thread',
    icon: 'copy',
    label: 'Copy thread ID',
    detail: thread.id,
    search: 'copy thread id reference',
    async run() {
      const copied = await copyText(thread.id)
      ctx.notify?.push(copied ? 'Copied thread ID' : 'Could not copy the thread ID', { level: copied ? 'info' : 'error' })
    },
  },
]
