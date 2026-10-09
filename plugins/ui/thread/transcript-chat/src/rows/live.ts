import type { Step } from '@sand/transcript-parts/contract'
import { div, icon, shine, span, type Sig } from '@sand/dom'
import { row, type RowContext, type RowMaker } from './row'

export type ToolStep = Extract<Step, { kind: 'tool' }>

const line = 'flex h-6 min-w-0 items-center gap-2 px-1 text-sm text-neutral-400'

export const thinkingLine = () => div({ class: line }, shine('Thinking'))

export const toolLine = (step: Sig<ToolStep>, context: RowContext) => {
  const renderer = () => context.registry.toolRenderer(step.get().tool.call.name)
  const label = () => renderer().label(step.get().tool)
  return div(
    { class: line },
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon(renderer().icon, 14)),
    span({ class: 'shrink-0 text-xs' }, () => renderer().activeVerb),
    span({ class: 'min-w-0 truncate font-mono text-xs text-neutral-200', title: label }, shine(label)),
  )
}

export const liveRow: RowMaker<'live'> = item => row(item.key, item, () => div({ class: 'mb-4' }, thinkingLine()))
