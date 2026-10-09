import type { ToolView } from '@sand/transcript-chat/contract'
import type { TruncatedAt } from '../contract'
import { div, el } from '@sand/dom'
import { plural } from '@sand/kit'
import { resultText } from '../thread/results'

export const errorTone = 'text-danger-400'

export const errorBody = (tool: ToolView) =>
  el('pre', { class: ['whitespace-pre-wrap wrap-anywhere font-mono text-xs', errorTone] }, resultText(tool.result) || 'The tool failed without a message')

export const truncatedNote = (count: number, position: TruncatedAt) =>
  div(
    { class: ['text-xs text-neutral-500', position === 'before' ? 'mb-1' : 'mt-1'] },
    `${plural(count, position === 'before' ? 'earlier line' : 'more line')} not shown`,
  )
