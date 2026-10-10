import { copyText, div, icon, popoverItem, span, type Child } from '@sand/dom'
import type { Context } from 'drydock'

interface Entry {
  label: string
  icon: string
  run(): void | Promise<void>
}

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const entryView = (entry: Entry, close: () => void) =>
  popoverItem(
    {
      onClick: () => {
        close()
        entry.run()
      },
    },
    span({ class: 'inline-flex text-neutral-500' }, icon(entry.icon, 14)),
    entry.label,
  )

export const renameSession = async (ctx: Context) => {
  const thread = ctx.threads?.current()
  if (!thread || !ctx.picker) return
  const title = (await ctx.picker.input('Rename thread', thread.info.title ?? ''))?.replace(/\s+/g, ' ').trim()
  if (title) await ctx.threads?.rename(thread.id, title)
}

export const sessionMenu = (ctx: Context, close: () => void): Child[] => {
  const command = (name: string, label: string, glyph: string): Entry[] =>
    ctx.commands?.get(name) ? [{ label, icon: glyph, run: () => void ctx.commands?.run(name) }] : []
  const thread = ctx.threads?.current()
  const session: Entry[] = thread
    ? [
        ...(ctx.picker ? [{ label: 'Rename…', icon: 'pencil', run: () => void renameSession(ctx) }] : []),
        ...command('retitle', 'Regenerate name', 'sparkles'),
        ...(thread.info.kind === 'agent'
          ? []
          : [
              ...command('fork', 'Fork from an earlier message', 'fork'),
              ...command('clone', 'Duplicate thread', 'duplicate'),
              ...command('continue', 'Continue on another PC…', 'monitor'),
            ]),
        {
          label: 'Copy link',
          icon: 'link',
          run: async () => {
            const copied = await copyText(location.href)
            ctx.notify?.push(copied ? 'Copied link' : 'Could not copy the link', { level: copied ? 'info' : 'error' })
          },
        },
      ]
    : []
  const app = [...command('devices', 'Connect a device', 'smartphone'), ...command('extensions', 'Interface', 'gear')]
  return [
    ...session.map(entry => entryView(entry, close)),
    session.length && app.length ? separator() : null,
    ...app.map(entry => entryView(entry, close)),
  ]
}
