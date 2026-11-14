import type { ToolView, TruncatedAt } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural, tildeHome } from '@sand/util'
import { div, el, type Child } from '@vaakx-dev/vrui'
import { resultText } from '../items/results'

export const outputText = (text: Child, error: boolean) =>
  el('pre', { class: ['whitespace-pre-wrap wrap-anywhere font-mono text-xs', error ? 'text-danger-400' : 'text-neutral-400'] }, text)

export const errorBody = (tool: ToolView) => outputText(tildeHome(resultText(tool.result)) || 'The tool failed without a message', true)

export const truncatedNote = ({ metaLine }: Kit, count: number, position: TruncatedAt) =>
  div({ class: ['flex', position === 'before' ? 'mb-1' : 'mt-1'] }, metaLine(`${plural(count, position === 'before' ? 'earlier line' : 'more line')} not shown`))
