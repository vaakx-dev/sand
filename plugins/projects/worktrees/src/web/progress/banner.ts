import type { SetupStep, WorktreeProgress } from '../../contract'
import { bannerTitle, clock, closeButton, derive, div, dynamicChild, errorText, icon, list, show, span, statusBanner, stepMark, type Sig, type StepState } from '@sand/dom'

const seconds = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`)

const steps: Record<SetupStep['state'], StepState> = { ok: 'done', fail: 'failed', run: 'running', wait: 'waiting' }

const timing = (step: SetupStep, now: number) => {
  if (step.state === 'run' && step.started) return seconds(Math.max(0, now - step.started))
  return step.ms === undefined ? '' : seconds(step.ms)
}

const stepRow = (step: Sig<SetupStep>, now: Sig<number>) =>
  div(
    { class: ['flex min-h-6 items-center gap-2', () => (step.get().state === 'wait' ? 'text-neutral-500' : 'text-neutral-300')] },
    dynamicChild(
      step.map(current => steps[current.state]),
      stepMark,
    ),
    span({ class: 'min-w-0 flex-1 truncate', title: () => step.get().label }, () => step.get().label),
    span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => timing(step.get(), now.get())),
  )

export const progressBanner = (progress: () => WorktreeProgress | undefined, dismiss: () => void) => {
  const now = clock(100)
  const all = derive(() => progress()?.steps ?? [])
  const error = derive(() => progress()?.error ?? '')
  return statusBanner(
    {},
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-1' },
      div(
        { class: 'flex min-h-6 items-center gap-2' },
        span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon('folder-git', 14)),
        div({ class: 'min-w-0 flex-1' }, bannerTitle(() => (error.get() ? 'Worktree setup stopped' : 'Setting up the worktree'))),
        show(
          () => Boolean(progress()?.done),
          () => closeButton({ title: 'Dismiss', size: 'sm', onClick: dismiss }),
        ),
      ),
      list(all, step => step.label, step => stepRow(step, now), div({ class: 'flex flex-col' })),
      show(
        () => Boolean(error.get()),
        () => errorText(() => error.get()),
      ),
    ),
  )
}
