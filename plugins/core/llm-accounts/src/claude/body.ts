import { fileText } from '@sand/kit'
import type { Block, Message, ToolReferenceBlock, ToolResultContent } from '@sand/messages'
import type { LLMRequest, ToolSpec } from '../contract'
import { loadedTools, withoutReferences } from '../http/deferred'
import { pair } from '../http/pair'
import { isReasoning } from '../reasoning'
import { describeClaude } from './models'

export interface ClaudeSettings {
  model: string
  maxTokens: number
}

const cacheable = new Set<unknown>(['text', 'image', 'document', 'tool_use', 'tool_result'])

const block = (value: Block | ToolReferenceBlock): Record<string, unknown> => {
  switch (value.type) {
    case 'text':
      return { type: 'text', text: value.text }
    case 'image':
      return { type: 'image', source: { type: 'base64', media_type: value.mediaType, data: value.data } }
    case 'document':
      return {
        type: 'document',
        source:
          value.mediaType === 'application/pdf'
            ? { type: 'base64', media_type: 'application/pdf', data: value.data }
            : { type: 'text', media_type: 'text/plain', data: value.data },
        ...(value.name && { title: value.name }),
      }
    case 'file':
      return { type: 'text', text: fileText(value) }
    case 'thinking':
      return { type: 'thinking', thinking: value.thinking, signature: value.signature }
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: value.data }
    case 'tool_call':
      return { type: 'tool_use', id: value.id, name: value.name, input: value.input }
    case 'tool_result':
      return { type: 'tool_result', tool_use_id: value.callId, content: value.content.map(block), is_error: value.isError }
    case 'tool_reference':
      return { type: 'tool_reference', tool_name: value.name }
  }
}

const withoutOpenAIReasoning = (messages: Message[]): Message[] =>
  messages.map(message => ({
    ...message,
    content: message.content.filter(block => !(block.type === 'thinking' && isReasoning(block.signature))),
  }))

const keepReferences = (deferred: Set<string>) => (content: ToolResultContent[]) => {
  const kept = content.filter(item => item.type === 'tool_reference' && deferred.has(item.name))
  return kept.length ? kept : withoutReferences(content)
}

const withReferences = (messages: Message[], refer: (content: ToolResultContent[]) => ToolResultContent[]): Message[] =>
  messages.map(message => ({
    ...message,
    content: message.content.map(item => (item.type === 'tool_result' ? { ...item, content: refer(item.content) } : item)),
  }))

const toolOf = (tool: ToolSpec, deferLoading: boolean) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema,
  ...(deferLoading && { defer_loading: true }),
})

const toolsFor = (request: LLMRequest, searches: boolean) => {
  if (!searches) return { tools: loadedTools(request.tools).map(tool => toolOf(tool, false)), refer: withoutReferences }
  const deferred = new Set(request.tools.flatMap(tool => (tool.deferred ? [tool.name] : [])))
  return { tools: request.tools.map(tool => toolOf(tool, deferred.has(tool.name))), refer: keepReferences(deferred) }
}

export const claudeBody = (request: LLMRequest, settings: ClaudeSettings, searches: boolean) => {
  const { efforts, fast } = describeClaude(settings.model)
  const { tools, refer } = toolsFor(request, searches)
  const messages = pair(withReferences(withoutOpenAIReasoning(request.messages), refer)).map(message => ({ role: message.role, content: message.content.map(block) }))
  const last = messages.at(-1)?.content.at(-1)
  if (last && cacheable.has(last.type)) last.cache_control = { type: 'ephemeral' }
  const effort = request.effort && efforts.includes(request.effort) ? request.effort : undefined
  return {
    model: settings.model,
    max_tokens: settings.maxTokens,
    stream: true,
    system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
    messages,
    ...(tools.length && { tools }),
    ...(effort && { output_config: { effort } }),
    ...(fast && request.speed === 'fast' && { speed: 'fast' }),
  }
}
