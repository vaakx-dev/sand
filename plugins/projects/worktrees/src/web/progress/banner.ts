import type { SetupStep, WorktreeProgress } from '../../contract'
import { clock, derive, div, dynamicChild, icon, iconButton, list, show, span, spinner, type Sig } from '@sand/dom'

const seconds = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`)

const mark = (state: SetupStep['state']) => {
  if (state === 'ok') return span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', 14))
  if (state === 'fail') return span({ class: 'inline-flex shrink-0 text-danger-400' }, icon('x', 14))
  if (state === 'run') return span({ class: 'inline-flex shrink-0 text-accent-400' }, spinner())
  return span({ class: 'mx-px inline-flex h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-600' })
}

const timing = (step: SetupStep, now: number) => {
  if (step.state === 'run' && step.started) return seconds(Math.max(0, now - step.started))
  return step.ms === undefined ? '' : seconds(step.ms)
}

const stepRow = (step: Sig<SetupStep>, now: Sig<number>) =>
  div(
    { class: () => ['flex min-h-6 items-center gap-2', step.get().state === 'wait' ? 'text-neutral-500' : 'text-neutral-300'].join(' ') },
    dynamicChild(
      step.map(current => current.state),
      mark,
    ),
    span({ class: 'min-w-0 flex-1 truncate', title: () => step.get().label }, () => step.get().label),
    span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => timing(step.get(), now.get())),
  )

export const progressBanner = (progress: () => WorktreeProgress | undefined, dismiss: () => void) => {
  const now = clock(100)
  const steps = derive(() => progress()?.steps ?? [])
  const error = derive(() => progress()?.error ?? '')
  return div(
    { role: 'status', class: 'flex w-full flex-col gap-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm animate-fade' },
    div(
      { class: 'flex min-h-6 items-center gap-2' },
      span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon('folder-git', 14)),
      span({ class: 'min-w-0 flex-1 truncate text-xs font-medium text-neutral-400' }, () => (error.get() ? 'Worktree setup stopped' : 'Setting up the worktree')),
      show(derive(() => Boolean(progress()?.done)), () => iconButton({ size: 'sm', title: 'Dismiss', onClick: dismiss }, icon('x', 13))),
    ),
    list(steps, step => step.label, step => stepRow(step, now), div({ class: 'flex flex-col' })),
    show(derive(() => Boolean(error.get())), () => div({ class: 'text-xs whitespace-pre-wrap wrap-anywhere text-danger-400' }, () => error.get())),
  )
}
