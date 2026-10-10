import { div, icon, popoverItem, span, type Child } from '@sand/dom'
import { messages } from '../actions/messages'
import { sendMessage, type ActionContext } from '../actions/send'
import { switchBranch } from '../actions/switch'
import type { Model } from '../model'
import { baseOf, mergeBlock, prBlock, pushBlock } from '../state/next'

interface Entry {
  label: string
  run(): void
  reason?: string
  glyph?: string
}

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const entryView = ({ label, run, reason, glyph }: Entry, close: () => void) =>
  popoverItem(
    {
      disabled: Boolean(reason),
      onClick: () => {
        close()
        run()
      },
    },
    glyph ? span({ class: 'inline-flex text-neutral-500' }, icon(glyph, 14)) : null,
    span({ class: 'min-w-0 flex-1 truncate' }, label),
    reason ? span({ class: 'shrink-0 text-neutral-500' }, reason) : null,
  )

export const gitMenu = (ctx: ActionContext, model: Model, close: () => void): Child[] => {
  const git = model.status.get()
  const pr = model.pr.get()
  const base = baseOf(git, pr)
  const send = (text: string) => () => void sendMessage(ctx, text)
  const steps: Entry[] = [
    { label: 'Commit', run: send(messages.commit), reason: git?.changed ? undefined : 'no changes' },
    { label: 'Push', run: send(messages.push), reason: pushBlock(git) },
    { label: 'Create PR', run: send(messages.pr), reason: prBlock(git, pr) },
    { label: `Pull from ${base}`, run: send(messages.pullBase(base)) },
    { label: 'Merge PR', run: send(messages.merge(base)), reason: pr === undefined && !ctx.pulls ? 'PR status unknown' : mergeBlock(pr) },
  ]
  const worktrees = model.worktrees.get()
  const places: Entry[] = [
    ...(worktrees ? [{ label: 'Move to worktree…', glyph: 'folder-git', run: () => worktrees.openMove(), reason: git?.worktree ? 'already in one' : undefined }] : []),
    ...(ctx.picker ? [{ label: 'Switch branch…', glyph: 'branch', run: () => void switchBranch(ctx, model) }] : []),
  ]
  return [...steps.map(entry => entryView(entry, close)), places.length ? separator() : null, ...places.map(entry => entryView(entry, close))]
}
