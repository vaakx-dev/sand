import type { Step } from '@sand/transcript-parts/contract'
import { div, dynamicChild, icon, list, shine, show, span, toolBody, toolCard, untrack, type Sig } from '@sand/dom'
import { row, type RowContext, type RowMaker } from './row'

type ToolStep = Extract<Step, { kind: 'tool' }>
type ThinkingStep = Extract<Step, { kind: 'thinking' }>

const toolView = (step: Sig<ToolStep>, context: RowContext) => {
  const { open, toggle } = context.states.get(untrack(() => step.get().key))
  return context.parts.toolStep(
    step.map(value => value.tool),
    { renderer: context.registry.toolRenderer, version: context.registry.version, open, toggle, menu: context.menu },
  )
}

const thinkingView = (step: Sig<ThinkingStep>, context: RowContext) => {
  const { open, toggle } = context.states.get(untrack(() => step.get().key))
  const streaming = step.map(value => value.streaming)
  const text = step.map(value => value.text.replace(/\s+/g, ' ').trim())
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

const stepView = (step: Sig<Step>, context: RowContext) =>
  untrack(() => step.get().kind) === 'tool' ? toolView(step as Sig<ToolStep>, context) : thinkingView(step as Sig<ThinkingStep>, context)

export const toolsRow: RowMaker<'tools'> = (item, context) =>
  row(`tools:${item.key}`, item, data =>
    list(
      data.map(value => value.steps),
      step => `${step.kind}:${step.key}`,
      step => stepView(step, context),
      div({ class: 'mb-3 flex flex-col' }),
    ),
  )
