import type { Block } from '@sand/messages'
import type { Effort, LLMRequest } from '../contract'
import { pair } from '../http/pair'

type ApiBlock = Record<string, unknown>

export interface BodyOptions {
  model: string
  maxTokens: number
  efforts: Effort[]
  fast?: boolean
  thinking?: 'summarized' | 'omitted'
  eagerInputStreaming?: boolean
}

const cacheable = new Set(['text', 'image', 'document', 'tool_use', 'tool_result'])

const block = (value: Block): ApiBlock => {
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
    case 'thinking':
      return { type: 'thinking', thinking: value.thinking, signature: value.signature }
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: value.data }
    case 'tool_call':
      return { type: 'tool_use', id: value.id, name: value.name, input: value.input }
    case 'tool_result':
      return { type: 'tool_result', tool_use_id: value.callId, content: value.content.map(block), is_error: value.isError }
  }
}

export const body = (request: LLMRequest, options: BodyOptions) => {
  const messages = pair(request.messages).map(message => ({ role: message.role, content: message.content.map(block) }))
  const last = messages.at(-1)?.content.at(-1)
  if (last && cacheable.has(last.type as string)) last.cache_control = { type: 'ephemeral' }
  const thinks = options.efforts.length > 0
  const effort = request.effort && options.efforts.includes(request.effort) ? request.effort : undefined
  const fast = options.fast && request.speed === 'fast'
  return {
    model: options.model,
    max_tokens: options.maxTokens,
    stream: true,
    system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
    messages,
    ...(request.tools.length && {
      tools: request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
        ...(options.eagerInputStreaming && { eager_input_streaming: true }),
      })),
    }),
    ...(options.thinking && thinks && { thinking: { type: 'adaptive', display: options.thinking } }),
    ...(effort && { output_config: { effort } }),
    ...(fast && { speed: 'fast' }),
  }
}
