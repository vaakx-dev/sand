import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript-parts/contract'
import { el } from '@sand/dom'
import { textOf } from '@sand/kit'

const references = (tool: ToolView) => tool.result?.content.flatMap(block => (block.type === 'tool_reference' ? [block.name] : [])) ?? []

export const foundRenderer = (views: ToolViews): ToolRenderer => ({
  icon: 'search',
  verb: 'Found tools',
  activeVerb: 'Finding tools',
  label: tool => views.field(tool.call.input, 'query'),
  meta: tool => references(tool).join(', '),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    return el('pre', { class: 'whitespace-pre-wrap wrap-anywhere font-mono text-xs text-neutral-400' }, textOf(tool.result.content))
  },
})
