import { div, icon, popoverItem, span, type Child } from '@sand/dom'
import type { GitContext, Model } from '../model'

interface Entry {
  label: string
  glyph: string
  run(): void
  note?: string
  blocked?: string
}

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const entryView = ({ label, glyph, run, note, blocked }: Entry, close: () => void) =>
  popoverItem(
    {
      disabled: Boolean(blocked),
      onClick: () => {
        close()
        run()
      },
    },
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon(glyph, 14)),
    span({ class: 'flex min-w-0 flex-1 flex-col py-1' }, span({ class: 'truncate' }, label), blocked || note ? span({ class: 'text-neutral-500' }, blocked ?? note) : null),
  )

export const gitMenu = (ctx: GitContext, model: Model, close: () => void): Child[] => {
  const git = model.status.get()
  const pr = model.pr.get()
  const worktrees = model.worktrees.get()
  const view: Entry[] = [
    ...(ctx.panels ? [{ label: 'View edits', glyph: 'file', run: () => ctx.panels?.show('changes') }] : []),
    ...(pr ? [{ label: `Open PR #${pr.number}`, glyph: 'external', run: () => void window.open(pr.url, '_blank', 'noopener') }] : []),
  ]
  const place: Entry[] = !worktrees || !git
    ? []
    : git.worktree
      ? [
          {
            label: 'Regenerate name',
            glyph: 'sparkles',
            note: 'New branch and folder name from the task',
            blocked: pr || git.upstream ? 'The branch is pushed, so it keeps its name' : undefined,
            run: () => worktrees.rename(),
          },
        ]
      : [{ label: 'Move to a worktree', glyph: 'folder-git', note: 'Named from the task, takes your changes', run: () => worktrees.openMove() }]
  return [
    div({ class: 'flex min-w-0 items-center gap-2 px-2 pt-2 pb-1 font-mono text-xs text-neutral-500' }, icon('branch', 12), span({ class: 'truncate' }, git?.branch ?? '')),
    ...view.map(entry => entryView(entry, close)),
    view.length && place.length ? separator() : null,
    ...place.map(entry => entryView(entry, close)),
  ]
}
