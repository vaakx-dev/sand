import type { PrSummary } from '@sand/github/contract'
import { isUnnamed } from '@sand/worktrees/contract'
import { chipButton, derive, div, dynamicChild, icon, popover, popupTrigger, shine, show, sig, span } from '@sand/dom'
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

const branchLabel = (model: Model) => {
  const git = model.status.get()
  const branch = git?.branch ?? ''
  if (isUnnamed(branch)) return [icon('folder-git', 12), shine(span({ class: 'text-middle' }, 'naming…'))]
  return [icon(git?.worktree ? 'folder-git' : 'branch', 12), span({ class: 'min-w-0 truncate py-1 text-middle' }, branch.replace(/^sand\//, ''))]
}

const prLabel = (pr: PrSummary) => {
  const state = pillState(pr)
  return span(
    { class: ['inline-flex shrink-0 items-center gap-1', tones[state.tone]], title: `#${pr.number} ${pr.title} · ${state.label}` },
    icon('compare', 12),
    span({ class: 'text-middle' }, `PR #${pr.number}`),
  )
}

const changedCount = (model: Model) => {
  const changed = derive(() => model.status.get()?.changed ?? 0)
  return show(
    () => changed.get() > 0,
    () => span({ class: 'shrink-0 tabular-nums text-middle', title: () => `${changed.get()} changed` }, () => `●${changed.get()}`),
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
    return `${git?.branch}:${git?.worktree}:${pr?.number}:${pr ? pillState(pr).tone : ''}`
  })
  const trigger = () => {
    const pr = model.pr.get()
    return chipButton(
      {
        title: () => model.status.get()?.branch ?? '',
        ...popupTrigger(open),
        active: open,
        onClick: toggle,
      },
      ...(pr ? [prLabel(pr)] : branchLabel(model)),
      changedCount(model),
    )
  }
  return show(
    () => Boolean(model.status.get()) && model.started.get(),
    () =>
      div(
        { class: 'flex min-w-0 items-center' },
        dynamicChild(key, trigger),
        show(open, () => popover(close, { class: 'bottom-full right-0 mb-2 w-80 max-w-full' }, ...gitMenu(ctx, model, close))),
      ),
  )
}
