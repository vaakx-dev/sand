import type { ToolView, TruncatedAt } from '../contract'
import { div, el } from '@sand/dom'
import { plural } from '@sand/kit'
import { resultText } from '../thread/results'

export const outputText = (text: string, error: boolean) =>
  el('pre', { class: ['whitespace-pre-wrap wrap-anywhere font-mono text-xs', error ? 'text-danger-400' : 'text-neutral-400'] }, text)

export const errorBody = (tool: ToolView) => outputText(resultText(tool.result) || 'The tool failed without a message', true)

export const truncatedNote = (count: number, position: TruncatedAt) =>
  div(
    { class: ['text-xs text-neutral-500', position === 'before' ? 'mb-1' : 'mt-1'] },
    `${plural(count, position === 'before' ? 'earlier line' : 'more line')} not shown`,
  )
