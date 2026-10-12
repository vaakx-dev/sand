import { oneLine } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

interface Entry {
  label: string
  icon: IconName
  run(): void | Promise<void>
}

const entryView = ({ popoverItem }: Kit, entry: Entry, close: () => void) =>
  popoverItem(
    {
      icon: entry.icon,
      onClick: () => {
        close()
        entry.run()
      },
    },
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
      ...command(ctx, 'worktree', 'Move to a worktree…', 'folder-git'),
    )
  entries.push({ label: 'Copy link', icon: 'link', run: () => copyWithNotice(ctx.notify, location.href, 'link') })
  return entries
}

export const sessionMenu = (ctx: Context<'kit'>, close: () => void): Child[] => {
  const { menuSeparator } = ctx.kit
  const thread = ctx.threads?.current()
  const session = thread ? threadEntries(ctx, thread.info.kind === 'agent') : []
  const app = [...command(ctx, 'devices', 'Connect a device', 'smartphone'), ...command(ctx, 'extensions', 'Interface', 'gear')]
  return [
    ...session.map(entry => entryView(ctx.kit, entry, close)),
    session.length && app.length ? menuSeparator() : null,
    ...app.map(entry => entryView(ctx.kit, entry, close)),
  ]
}
