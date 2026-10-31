import type { StepState } from '@sand/ui-kit/contract'
import type { SetupState, SetupStep, WorktreeSetup } from '@sand/worktrees/contract'
import { derive, div, dynamicChild, effect, show, sig, span } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { phaseOf, type SetupModel, type SetupPhase } from './follow'

const tailLines = 12

const marks: Record<SetupState, StepState> = { wait: 'waiting', run: 'running', ok: 'done', fail: 'failed', skip: 'waiting' }

const headlines: Record<SetupPhase, string> = { running: 'Setting up worktree…', failed: 'Worktree setup failed', ready: 'Worktree ready' }

const tail = (output: string) => output.trimEnd().split('\n').slice(-tailLines).join('\n')

const focusStep = (setup: WorktreeSetup | undefined) =>
  setup?.steps.find(step => step.state === 'fail') ?? setup?.steps.find(step => step.state === 'run')

export const setupCard = (ctx: WorkspaceContext, model: SetupModel) => () => {
  const { kit } = ctx
  const expanded = sig(false)
  const phase = derive(() => {
    const setup = model.setup.get()
    return setup ? phaseOf(setup) : 'running'
  })
  const step = derive(() => focusStep(model.setup.get()))

  effect(() => {
    if (phase.get() === 'failed') expanded.set(true)
  })

  const glyph = (value: SetupPhase) => (value === 'running' ? kit.spinner('sm') : value === 'failed' ? kit.stepMark('failed') : kit.okMark('sm'))

  const stepRow = (item: SetupStep) =>
    div(
      { class: 'flex min-w-0 items-center gap-1.5' },
      kit.stepMark(marks[item.state]),
      span({ class: 'min-w-0 truncate' }, item.state === 'skip' ? `${item.label} (skipped)` : item.label),
    )

  const output = (item: SetupStep | undefined) => {
    const text = item?.output && tail(item.output)
    return text ? kit.codeBlock({ copy: () => item?.output ?? '', class: 'max-h-40 leading-4' }, text) : null
  }

  const steps = () =>
    div(
      { class: 'flex flex-col gap-1 pt-1 text-xs text-neutral-400' },
      dynamicChild(model.setup, setup => div({ class: 'flex flex-col gap-1' }, ...(setup?.steps ?? []).map(stepRow))),
      dynamicChild(step, output),
    )

  const actions = () =>
    div(
      { class: 'flex items-center gap-1 pt-1' },
      kit.secondaryAction({ size: 'sm', onClick: () => void model.retry() }, kit.icon('retry', 'sm'), 'Retry'),
      kit.quietButton({ size: 'sm', onClick: () => void model.skip() }, 'Continue anyway'),
    )

  return div(
    { class: 'flex w-80 max-w-full flex-col px-2 py-1' },
    kit.plainButton(
      {
        class: 'flex min-w-0 items-center gap-1.5 text-neutral-400 hover:text-neutral-100',
        'aria-expanded': () => String(expanded.get()),
        onClick: () => expanded.update(value => !value),
      },
      dynamicChild(phase, glyph),
      span({ class: 'shrink-0' }, () => headlines[phase.get()]),
      span({ class: 'min-w-0 flex-1 truncate text-neutral-500' }, () => (phase.get() === 'ready' ? '' : (step.get()?.label ?? ''))),
      span({ class: 'inline-flex shrink-0' }, dynamicChild(expanded, open => kit.icon(open ? 'down' : 'up', 'sm'))),
    ),
    show(expanded, steps),
    show(() => phase.get() === 'failed', actions),
  )
}
