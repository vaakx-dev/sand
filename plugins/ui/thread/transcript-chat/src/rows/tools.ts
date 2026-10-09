import { toolStep, type Step, type ToolGroup } from '@sand/conversation'
import { derive, div, duration, dynamicChild, elapsed, icon, list, shine, show, span, toolBody, toolCard, untrack, type Sig } from '@sand/dom'
import { plural } from '@sand/kit'
import { thinkingLine, toolLine, type ToolStep } from './live'
import { row, worked, type RowContext, type RowMaker } from './row'

type ThinkingStep = Extract<Step, { kind: 'thinking' }>

const isActive = (step: Step): step is ToolStep => step.kind === 'tool' && (step.tool.status === 'running' || step.tool.status === 'pending')

const activeKey = (group: ToolGroup) => group.steps.findLast(isActive)?.key ?? ''

const toolView = (step: Sig<ToolStep>, context: RowContext) => {
  const { open, toggle } = context.states.get(untrack(() => step.get().key))
  return toolStep(
    step.map(value => value.tool),
    { renderer: context.registry.toolRenderer, version: context.registry.version, open, toggle },
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

const liveLine = (data: Sig<ToolGroup>, context: RowContext) =>
  dynamicChild(data.map(activeKey), key =>
    key ? toolLine(data.map(value => value.steps.find(step => step.key === key) as ToolStep), context) : thinkingLine(),
  )

const took = (group: ToolGroup) => `Worked for ${duration(Math.max(1000, group.end - group.start))}`

export const toolsRow: RowMaker<'tools'> = (item, context) =>
  row(`tools:${item.key}`, item, data => {
    const { open, toggle } = context.states.get(item.key)
    const running = data.map(value => value.running)
    const count = data.map(value => value.steps.filter(step => step.kind === 'tool').length)
    return div(
      { class: 'mb-4' },
      worked(
        toggle,
        open,
        dynamicChild(running, live => (live ? span('Working for ', elapsed(data.map(value => value.start))) : span(() => took(data.get())))),
        span({ class: 'text-xs text-neutral-500' }, () => plural(count.get(), 'tool')),
      ),
      show(
        derive(() => running.get() && !open.get()),
        () => liveLine(data, context),
      ),
      show(open, () =>
        list(
          data.map(value => value.steps),
          step => `${step.kind}:${step.key}`,
          step => stepView(step, context),
          div({ class: 'mt-1 mb-1 flex flex-col rounded-xl bg-neutral-900 p-1 ring-1 ring-neutral-800' }),
        ),
      ),
    )
  })
