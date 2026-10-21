import type { Block, StopReason } from '@sand/chats/contract'
import type { LLMEvent, Usage } from '../contract'
import { ApiError } from '../http/error'
import { parseToolInput } from '../http/tool-input'
import type { ClaudeEvent, RawBlock, RawUsage } from './events'

const toBlock = (block: RawBlock): Block | undefined => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text ?? '' }
    case 'thinking':
      return { type: 'thinking', thinking: block.thinking ?? '', ...(block.signature && { signature: block.signature }) }
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: block.data }
    case 'tool_use':
      return { type: 'tool_call', id: block.id, name: block.name, input: {} }
  }
}

const merge = (usage: Usage, raw: RawUsage | undefined) => {
  if (raw?.input_tokens != null) usage.input = raw.input_tokens
  if (raw?.output_tokens != null) usage.output = raw.output_tokens
  if (raw?.cache_read_input_tokens != null) usage.cacheRead = raw.cache_read_input_tokens
  if (raw?.cache_creation_input_tokens != null) usage.cacheWrite = raw.cache_creation_input_tokens
}

export async function* read(stream: AsyncIterable<ClaudeEvent>): AsyncIterable<LLMEvent> {
  const blocks: Block[] = []
  const json: string[] = []
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  let stopReason: StopReason = 'end_turn'
  for await (const event of stream) {
    switch (event.type) {
      case 'message_start':
        merge(usage, event.message.usage)
        yield { type: 'start', model: event.message.model }
        break
      case 'content_block_start': {
        const { index } = event
        const started = toBlock(event.content_block)
        if (!started) break
        blocks[index] = started
        if (started.type === 'tool_call') {
          json[index] = ''
          yield { type: 'tool_call', index, id: started.id, name: started.name }
        }
        break
      }
      case 'content_block_delta': {
        const { index, delta } = event
        const block = blocks[index]
        if (delta.type === 'text_delta' && block?.type === 'text') {
          block.text += delta.text
          yield { type: 'text', index, text: delta.text }
        } else if (delta.type === 'thinking_delta' && block?.type === 'thinking') {
          block.thinking += delta.thinking
          yield { type: 'thinking', index, text: delta.thinking }
        } else if (delta.type === 'signature_delta' && block?.type === 'thinking') {
          block.signature = (block.signature ?? '') + delta.signature
        } else if (delta.type === 'input_json_delta' && block?.type === 'tool_call') {
          json[index] += delta.partial_json
          yield { type: 'tool_input', index, json: delta.partial_json }
        }
        break
      }
      case 'content_block_stop': {
        const { index } = event
        const block = blocks[index]
        if (block?.type === 'tool_call') parseToolInput(block, json[index] ?? '')
        if (block) yield { type: 'block', index, block }
        break
      }
      case 'message_delta':
        stopReason = event.delta?.stop_reason ?? stopReason
        merge(usage, event.usage)
        break
      case 'message_stop':
        yield { type: 'done', message: { role: 'assistant', content: blocks.filter(Boolean) }, stopReason, usage }
        return
      case 'error':
        throw new ApiError(undefined, event.error?.type ?? 'api_error', event.error?.message ?? 'stream error')
    }
  }
  throw new Error('Stream ended before message_stop')
}
