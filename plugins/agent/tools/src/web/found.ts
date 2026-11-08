import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { textOf } from '@sand/chats/contract'

const references = (tool: ToolView) => tool.result?.content.flatMap(block => (block.type === 'tool_reference' ? [block.name] : [])) ?? []

export const foundRenderer = ({ codeBlock }: Kit, views: ToolViews): ToolRenderer => ({
  icon: 'search',
  verb: 'Found tools',
  activeVerb: 'Finding tools',
  label: tool => views.field(tool.call.input, 'query'),
  meta: tool => references(tool).join(', '),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    return codeBlock({}, textOf(tool.result.content))
  },
})
