import type { OpenState, Step } from '@sand/transcript-parts/contract'
import { div, dynamicChild, icon, list, shine, show, span, toolBody, toolCard, untrack, type Sig } from '@sand/dom'
import { oneLine } from '@sand/kit'
import { row, type RowContext, type RowMaker } from './row'

type ThinkingStep = Extract<Step, { kind: 'thinking' }>

const thinkingView = (step: Sig<ThinkingStep>, { open, toggle }: OpenState) => {
  const streaming = step.map(value => value.streaming)
  const text = step.map(value => oneLine(value.text))
  return toolCard(
    {
      icon: icon('message', 14),
      verb: () => (streaming.get() ? 'Thinking' : 'Thought'),
      target: dynamicChild(streaming, live => (live ? shine(text) : span(text))),
      targetClass: 'italic text-neutral-500',
      onToggle: toggle,
    },
    show(open, () => toolBody(div({ class: 'whitespace-pre-wrap text-neutral-400' }, step.map(value => value.text)))),
  )
}

const stepView = (step: Sig<Step>, context: RowContext) => {
  const first = untrack(() => step.get())
  const state = context.states.get(first.key)
  if (first.kind === 'thinking') return thinkingView(step.map(value => (value.kind === 'thinking' ? value : first)), state)
  const { registry, parts, menu } = context
  return parts.toolStep(
    step.map(value => (value.kind === 'tool' ? value.tool : first.tool)),
    { renderer: registry.toolRenderer, version: registry.version, ...state, menu },
  )
}

export const toolsRow: RowMaker<'tools'> = (item, context) =>
  row(`tools:${item.key}`, item, data =>
    list(
      data.map(value => value.steps),
      step => `${step.kind}:${step.key}`,
      step => stepView(step, context),
      div({ class: 'mb-3 flex flex-col' }),
    ),
  )
