import type { Markdown } from '@sand/markdown/contract'
import type { ToolStepOptions, TranscriptParts } from '@sand/transcript-parts/contract'
import { div, dynamicChild, span, untrack, type Sig } from '@sand/dom'
import type { Line } from './lines'

export type StepOptions = (key: string) => ToolStepOptions

export interface LineContext {
  parts: TranscriptParts
  markdown: Markdown
  options: StepOptions
}

const tones: Record<string, string> = {
  u: 'text-accent-400',
  t: 'text-warning-400',
  a: 'text-success-400',
  bad: 'text-danger-400',
  dim: 'text-neutral-500',
}

const time = (at?: number) => (at ? new Date(at).toTimeString().slice(0, 5) : '')

const content = (value: Line, markdown: Markdown) => {
  if (value.node) return value.node
  return span({ class: value.markdown ? 'markdown' : '' }, value.markdown ? markdown.inline(value.text) : value.text)
}

const textCell = (line: Sig<Line>, markdown: Markdown) =>
  div(
    { class: 'min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere' },
    dynamicChild(
      line.map(value => value.node ?? `${value.markdown ? 'm' : 't'}${value.text}`),
      () => content(untrack(() => line.get()), markdown),
    ),
  )

const toolCell = (line: Sig<Line>, { parts, options }: LineContext) =>
  div(
    { class: 'min-w-0 flex-1' },
    parts.toolStep(
      line.map(value => value.tool!),
      options(untrack(() => line.get().key)),
    ),
  )

export const lineView = (line: Sig<Line>, context: LineContext) => {
  const tool = Boolean(untrack(() => line.get().tool))
  const aligned = tool ? 'pt-2' : ''
  return div(
    { class: 'flex gap-3' },
    span({ class: ['hidden w-12 shrink-0 text-neutral-500 md:block', aligned] }, () => time(line.get().at)),
    span({ class: () => ['w-16 shrink-0 truncate', aligned, tones[line.get().tone] ?? 'text-neutral-400'], title: () => line.get().tag }, () => line.get().tag),
    tool ? toolCell(line, context) : textCell(line, context.markdown),
  )
}
