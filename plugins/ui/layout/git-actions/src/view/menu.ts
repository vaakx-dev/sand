import type { GitStatus } from '@sand/git/contract'
import type { Worktrees } from '@sand/worktrees/contract'
import { div, icon, menuSeparator, openTab, popoverItem, span, type Child, type IconName } from '@sand/dom'
import type { GitContext, Model, Pr } from '../model'

interface Entry {
  label: string
  glyph: IconName
  run(): void
  note?: string
  blocked?: string
}

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

const viewEntries = (ctx: GitContext, pr: Pr) => {
  const entries: Entry[] = []
  if (ctx.panels) entries.push({ label: 'View edits', glyph: 'file', run: () => ctx.panels?.show('changes') })
  if (pr) entries.push({ label: `Open PR #${pr.number}`, glyph: 'external', run: () => openTab(pr.url) })
  return entries
}

const placeEntries = (git: GitStatus | undefined, worktrees: Worktrees | undefined, pr: Pr): Entry[] => {
  if (!worktrees || !git) return []
  if (!git.worktree) return [{ label: 'Move to a worktree', glyph: 'folder-git', note: 'Named from the task, takes your changes', run: () => worktrees.openMove() }]
  return [
    {
      label: 'Regenerate name',
      glyph: 'sparkles',
      note: 'New branch and folder name from the task',
      blocked: pr || git.upstream ? 'The branch is pushed, so it keeps its name' : undefined,
      run: () => worktrees.rename(),
    },
  ]
}

export const gitMenu = (ctx: GitContext, model: Model, close: () => void): Child[] => {
  const git = model.status.get()
  const pr = model.pr.get()
  const view = viewEntries(ctx, pr)
  const place = placeEntries(git, model.worktrees.get(), pr)
  return [
    div({ class: 'flex min-w-0 items-center gap-2 px-2 pt-2 pb-1 font-mono text-xs text-neutral-500' }, icon('branch', 12), span({ class: 'truncate' }, git?.branch ?? '')),
    ...view.map(entry => entryView(entry, close)),
    view.length && place.length ? menuSeparator() : null,
    ...place.map(entry => entryView(entry, close)),
  ]
}
