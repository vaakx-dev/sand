import { div, errorMessage, icon, popoverItem, span, type Child } from '@sand/dom'
import type { GitContext, Model } from '../model'

interface Entry {
  label: string
  glyph: string
  run(): void
  detail?: string
  note?: string
}

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const entryView = ({ label, glyph, run, detail, note }: Entry, close: () => void) =>
  popoverItem(
    {
      onClick: () => {
        close()
        run()
      },
    },
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon(glyph, 14)),
    span({ class: 'flex min-w-0 flex-1 flex-col py-1' }, span({ class: 'truncate' }, label), note ? span({ class: 'text-neutral-500' }, note) : null),
    detail ? span({ class: 'shrink-0 text-neutral-500' }, detail) : null,
  )

const runCommand = async (ctx: GitContext, name: string) => {
  if (ctx.commands?.get(name)) return void (await ctx.commands.run(name, ''))
  if (!ctx.wire) throw new Error(`No command host is loaded to run /${name}`)
  await ctx.wire.call({ type: 'ui.command', name, args: '', session: ctx.threads.current()?.id, cwd: ctx.threads.cwd() })
}

export const gitMenu = (ctx: GitContext, model: Model, close: () => void): Child[] => {
  const git = model.status.get()
  const pr = model.pr.get()
  const worktrees = model.worktrees.get()
  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const shared = Boolean(pr || git?.upstream)
  const view: Entry[] = [
    ...(ctx.panels ? [{ label: 'View edits', glyph: 'file', run: () => ctx.panels?.show('changes') }] : []),
    ...(pr ? [{ label: `Open PR #${pr.number}`, glyph: 'external', run: () => void window.open(pr.url, '_blank', 'noopener') }] : []),
  ]
  const change: Entry[] = [
    ...(worktrees && git && !git.worktree ? [{ label: 'Move to a worktree', glyph: 'folder-git', note: 'Named from the task, takes your changes', run: () => worktrees.openMove() }] : []),
    {
      label: 'Regenerate name',
      glyph: 'sparkles',
      note: git?.worktree && shared ? 'Thread only, the pushed branch keeps its name' : undefined,
      run: () => void runCommand(ctx, 'retitle').catch(fail),
    },
  ]
  return [
    div({ class: 'flex min-w-0 items-center gap-2 px-2 pt-2 pb-1 font-mono text-xs text-neutral-500' }, icon('branch', 12), span({ class: 'truncate' }, git?.branch ?? '')),
    ...view.map(entry => entryView(entry, close)),
    view.length ? separator() : null,
    ...change.map(entry => entryView(entry, close)),
  ]
}
