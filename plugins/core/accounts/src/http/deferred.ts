import type { ModelContent, TextBlock, ToolResultContent } from '@sand/chats/contract'
import type { ToolSpec } from '../contract'

export const loadedTools = (tools: ToolSpec[]) => tools.filter(tool => !tool.deferred || tool.deferred.found)

const referenceNote = (name: string): TextBlock => ({ type: 'text', text: `The ${name} tool is now available.` })

export const withoutReferences = (content: ToolResultContent[]): ModelContent[] =>
  content.map(block => (block.type === 'tool_reference' ? referenceNote(block.name) : block))
