import type { AppOutput } from '@sand/llm-accounts/contract'
import type { StopReason } from '@sand/messages'
import { fieldsOf, type Json } from '../cli/connection'

const prefix = /^mcp__sand__/

const usageOf = (raw: Json) => ({
  input: Number(raw.input_tokens ?? 0),
  output: Number(raw.output_tokens ?? 0),
  cacheRead: Number(raw.cache_read_input_tokens ?? 0),
  cacheWrite: Number(raw.cache_creation_input_tokens ?? 0),
})

export const createReader = (output: AppOutput) => {
  let calls = 0
  let stop: StopReason = 'end_turn'

  const streamEvent = (event: Json) => {
    if (event.type === 'message_start') calls = 0
    if (event.type === 'content_block_delta') {
      const delta = fieldsOf(event.delta)
      if (delta.type === 'text_delta' && typeof delta.text === 'string') output.text(delta.text)
      if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string') output.thinking(delta.thinking)
    }
    if (event.type === 'message_delta') {
      const delta = fieldsOf(event.delta)
      if (typeof delta.stop_reason === 'string') stop = delta.stop_reason
      output.usage(usageOf(fieldsOf(event.usage)))
    }
    if (event.type === 'message_stop' && calls) output.pause()
  }

  const assistant = (message: Json) => {
    const content = fieldsOf(message.message).content
    for (const block of Array.isArray(content) ? content.map(fieldsOf) : []) {
      if (block.type !== 'tool_use') continue
      calls++
      output.call({ id: String(block.id), name: String(block.name).replace(prefix, ''), input: fieldsOf(block.input) })
    }
  }

  return {
    read(message: Json) {
      if (message.type === 'stream_event') streamEvent(fieldsOf(message.event))
      if (message.type === 'assistant') assistant(message)
    },
    finish(result: Json) {
      if (result.subtype === 'success') return output.finish(stop)
      output.fail(new Error(typeof result.result === 'string' && result.result ? result.result : `Claude Code stopped: ${String(result.subtype)}`))
    },
  }
}
