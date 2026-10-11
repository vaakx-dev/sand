import type { GitStatus } from '@sand/git/contract'
import type { Worktrees } from '@sand/worktrees/contract'
import type { Thread } from '@sand/web-client/contract'
import { div, errorMessage, icon, menuSeparator, openTab, popoverItem, span, type Child, type IconName } from '@sand/dom'
import { plural } from '@sand/kit'
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

const catchUpPrompt = (base: string) =>
  `Rebase this branch onto the latest origin/${base}. Fetch origin first. If a conflict comes up, stop and ask me how to resolve it before you go on.`

const catchUp = (ctx: GitContext, thread: Thread, base: string) => {
  const label = `Catch up with ${base}`
  ctx.turns
    ?.send(thread.id, catchUpPrompt(base), label, thread.running ? 'queue' : undefined)
    .catch(error => ctx.notify?.push(`Could not ask the agent to catch up: ${errorMessage(error)}`, { level: 'error' }))
}

const syncEntries = (ctx: GitContext, git: GitStatus | undefined): Entry[] => {
  const thread = ctx.threads.current()
  const base = git?.base
  if (!ctx.turns || !thread || !base || !git.behindBase) return []
  return [{ label: `Catch up with ${base}`, glyph: 'reload', note: `${plural(git.behindBase, 'new commit')}, the agent rebases`, run: () => catchUp(ctx, thread, base) }]
}

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
      note: 'New branch name from the task',
      blocked: pr || git.upstream ? 'The branch is pushed, so it keeps its name' : undefined,
      run: () => worktrees.rename(),
    },
  ]
}

export const gitMenu = (ctx: GitContext, model: Model, close: () => void): Child[] => {
  const git = model.status.get()
  const pr = model.pr.get()
  const groups = [syncEntries(ctx, git), viewEntries(ctx, pr), placeEntries(git, model.worktrees.get(), pr)].filter(group => group.length)
  return [
    div({ class: 'flex min-w-0 items-center gap-2 px-2 pt-2 pb-1 font-mono text-xs text-neutral-500' }, icon('branch', 12), span({ class: 'truncate' }, git?.branch ?? '')),
    ...groups.flatMap((group, index) => [index ? menuSeparator() : null, ...group.map(entry => entryView(entry, close))]),
  ]
}
