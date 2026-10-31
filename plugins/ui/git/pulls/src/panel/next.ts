import type { PullSummary } from '@sand/github/contract'
import { div, span } from '@vaakx-dev/vrui'
import { type NextStep, nextStep } from '../pull/next'
import { agentPrompt } from '../pull/prompts'
import { mergeControl } from './merge'
import type { Shown } from './shown'

const stepText = (step: NextStep) => [span({ class: 'font-medium' }, step.title), step.detail ? span(` · ${step.detail}`) : null]

const stepButton = (shown: Shown, step: NextStep, summary: PullSummary) => {
  const { parts, link, at, state } = shown
  const run = () => {
    if (step.kind === 'ready') return void state.run(() => parts.actions.ready(link, at))
    const prompt = agentPrompt(step.kind, summary)
    if (prompt) void state.run(() => parts.actions.ask(at, prompt))
  }
  const hint = step.kind !== 'ready' && { title: 'Sends the agent a prepared prompt in this thread' }
  return parts.kit.primaryAction({ size: 'sm', ...hint, disabled: state.busy, onClick: run }, step.action)
}

export const nextCallout = (shown: Shown, summary: PullSummary) => {
  const step = nextStep(summary)
  if (!step) return null
  const { callout } = shown.parts.kit
  if (step.kind === 'merge')
    return callout(step.look, div({ class: 'flex min-w-0 flex-1 flex-col gap-2' }, div(...stepText(step)), mergeControl(shown, summary)))
  return callout(step.look, div({ class: 'min-w-0 flex-1' }, ...stepText(step)), stepButton(shown, step, summary))
}
