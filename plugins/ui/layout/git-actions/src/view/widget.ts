import { isUnnamed } from '@sand/worktrees/contract'
import { button, derive, div, dynamicChild, focusable, icon, popover, shine, show, sig, SPACE, span } from '@sand/dom'
import type { GitContext, Model } from '../model'
import { pillState, type PillTone } from '../state/pill'
import { gitMenu } from './menu'

const look = 'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors hover:bg-neutral-800 hover:text-neutral-200 ' + focusable

const tones: Record<PillTone, string> = {
  running: 'text-warning-400',
  failing: 'text-danger-400',
  ready: 'text-success-400',
  merged: 'text-accent-300',
  quiet: 'text-neutral-400',
}

const above = { right: '0', bottom: '100%', width: `min(${SPACE['80']}, 100%)` }

const label = (text: () => string) => span({ class: 'min-w-0 truncate py-1 text-middle' }, text)

const branchLabel = (model: Model) => {
  const git = model.status.get()
  const branch = git?.branch ?? ''
  if (isUnnamed(branch)) return [icon('folder-git', 12), shine(span({ class: 'text-middle' }, 'naming…'))]
  return [icon(git?.worktree ? 'folder-git' : 'branch', 12), label(() => branch.replace(/^sand\//, ''))]
}

const prLabel = (model: Model) => {
  const pr = model.pr.get()
  if (!pr) return []
  const state = pillState(pr)
  return [span({ class: ['inline-flex shrink-0 items-center gap-1', tones[state.tone]], title: `#${pr.number} ${pr.title} · ${state.label}` }, icon('compare', 12), span({ class: 'text-middle' }, `PR #${pr.number}`))]
}

export const gitWidget = (ctx: GitContext, model: Model) => {
  const open = sig(false)
  const close = () => open.set(false)
  const changed = derive(() => model.status.get()?.changed ?? 0)
  const toggle = () => {
    if (open.get()) return close()
    model.refreshPr()
    open.set(true)
  }
  const key = derive(() => `${model.status.get()?.branch}:${model.status.get()?.worktree}:${model.pr.get()?.number}:${model.pr.get() ? pillState(model.pr.get()!).tone : ''}`)
  const trigger = () =>
    button(
      {
        type: 'button',
        title: () => model.status.get()?.branch ?? '',
        'aria-expanded': open,
        class: [look, () => (open.get() ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500')],
        onClick: toggle,
      },
      ...(model.pr.get() ? prLabel(model) : branchLabel(model)),
      show(
        derive(() => changed.get() > 0),
        () => span({ class: 'shrink-0 tabular-nums text-middle', title: () => `${changed.get()} changed` }, () => `●${changed.get()}`),
      ),
    )
  return show(
    derive(() => Boolean(model.status.get()) && model.started.get()),
    () =>
      div(
        { class: 'flex min-w-0 items-center' },
        dynamicChild(key, trigger),
        show(open, () => popover(close, { class: 'mb-2', style: above }, ...gitMenu(ctx, model, close))),
      ),
  )
}
