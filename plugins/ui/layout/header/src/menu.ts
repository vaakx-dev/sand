import { copyWithNotice, icon, menuSeparator, popoverItem, span, type Child, type IconName } from '@sand/dom'
import { oneLine } from '@sand/kit'
import type { Context } from 'drydock'

interface Entry {
  label: string
  icon: IconName
  run(): void | Promise<void>
}

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

const command = (ctx: Context, name: string, label: string, glyph: IconName): Entry[] =>
  ctx.commands?.get(name) ? [{ label, icon: glyph, run: () => void ctx.commands?.run(name) }] : []

export const renameSession = async (ctx: Context) => {
  const thread = ctx.threads?.current()
  if (!thread || !ctx.picker) return
  const title = oneLine((await ctx.picker.input('Rename thread', thread.info.title ?? '')) ?? '')
  if (title) await ctx.threads?.rename(thread.id, title)
}

const threadEntries = (ctx: Context, agent: boolean) => {
  const entries: Entry[] = []
  if (ctx.picker) entries.push({ label: 'Rename…', icon: 'pencil', run: () => void renameSession(ctx) })
  entries.push(...command(ctx, 'retitle', 'Regenerate name', 'sparkles'))
  if (!agent)
    entries.push(
      ...command(ctx, 'fork', 'Fork from an earlier message', 'fork'),
      ...command(ctx, 'clone', 'Duplicate thread', 'duplicate'),
      ...command(ctx, 'continue', 'Continue on another PC…', 'monitor'),
      ...command(ctx, 'worktree', 'Move to worktree…', 'folder-git'),
    )
  entries.push({ label: 'Copy link', icon: 'link', run: () => copyWithNotice(ctx.notify, location.href, 'link') })
  return entries
}

export const sessionMenu = (ctx: Context, close: () => void): Child[] => {
  const thread = ctx.threads?.current()
  const session = thread ? threadEntries(ctx, thread.info.kind === 'agent') : []
  const app = [...command(ctx, 'devices', 'Connect a device', 'smartphone'), ...command(ctx, 'extensions', 'Interface', 'gear')]
  return [
    ...session.map(entry => entryView(entry, close)),
    session.length && app.length ? menuSeparator() : null,
    ...app.map(entry => entryView(entry, close)),
  ]
}
