import type { GitStatus } from '@sand/git/contract'
import type { PrSummary } from '@sand/github/contract'
import { isUnnamed } from '@sand/worktrees/contract'
import { chipButton, chipPopover, derive, div, dynamicChild, icon, popupTrigger, shine, show, sig, span, type IconName } from '@sand/dom'
import { plural } from '@sand/kit'
import type { GitContext, Model } from '../model'
import { pillState, type PillTone } from '../state/pill'
import { gitMenu } from './menu'

const tones: Record<PillTone, string> = {
  running: 'text-warning-400',
  failing: 'text-danger-400',
  ready: 'text-success-400',
  merged: 'text-accent-300',
  quiet: 'text-neutral-400',
}

const isBehind = (git: GitStatus | undefined) => Boolean(git?.base && git.behindBase)

const glyph = (name: IconName, behind: boolean) =>
  span(
    { class: 'relative inline-flex shrink-0' },
    icon(name, 12),
    behind ? span({ class: 'absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-warning-400 ring-1 ring-neutral-900' }) : null,
  )

const chipTitle = (git: GitStatus | undefined) => {
  if (!git) return ''
  if (!isBehind(git)) return git.branch
  return `${git.branch}\n${git.base} has ${plural(git.behindBase, 'new commit')}`
}

const branchLabel = (model: Model) => {
  const git = model.status.get()
  const branch = git?.branch ?? ''
  if (isUnnamed(branch)) return [icon('folder-git', 12), shine(span({ class: 'text-box-trim' }, 'Naming…'))]
  return [glyph(git?.worktree ? 'folder-git' : 'branch', isBehind(git)), span({ class: 'min-w-0 truncate py-1 text-box-trim' }, branch.replace(/^sand\//, ''))]
}

const prLabel = (pr: PrSummary, behind: boolean) => {
  const state = pillState(pr)
  return span(
    { class: ['inline-flex shrink-0 items-center gap-1.5', tones[state.tone]], title: `#${pr.number} ${pr.title} · ${state.label}` },
    glyph('compare', behind),
    span({ class: 'text-box-trim' }, `PR #${pr.number}`),
  )
}

const changedCount = (model: Model) => {
  const changed = derive(() => model.status.get()?.changed ?? 0)
  return show(
    () => changed.get() > 0,
    () => span({ class: 'shrink-0 tabular-nums text-box-trim', title: () => `${changed.get()} changed` }, () => `●${changed.get()}`),
  )
}

export const gitWidget = (ctx: GitContext, model: Model) => {
  const open = sig(false)
  const close = () => open.set(false)
  const toggle = () => {
    if (open.get()) return close()
    model.refreshPr()
    open.set(true)
  }
  const key = derive(() => {
    const git = model.status.get()
    const pr = model.pr.get()
    return `${git?.branch}:${git?.worktree}:${isBehind(git)}:${pr?.number}:${pr ? pillState(pr).tone : ''}`
  })
  const trigger = () => {
    const pr = model.pr.get()
    return chipButton(
      {
        title: () => chipTitle(model.status.get()),
        ...popupTrigger(open),
        active: open,
        menu: true,
        onClick: toggle,
      },
      ...(pr ? [prLabel(pr, isBehind(model.status.get()))] : branchLabel(model)),
      changedCount(model),
    )
  }
  return div(
    { class: 'flex min-w-0 items-center' },
    dynamicChild(key, trigger),
    show(open, () => chipPopover(close, { class: 'right-0' }, ...gitMenu(ctx, model, close))),
  )
}
