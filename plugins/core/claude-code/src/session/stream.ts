import { type AppOutput, cacheLifetimes, type Usage, UsageLimited, writtenTtl } from '@sand/accounts/contract'
import type { StopReason } from '@sand/chats/contract'
import { fieldsOf, type Json } from '../cli/connection'

interface Limit {
  rejected: boolean
  resetsAt?: number
}

const prefix = /^mcp__sand__/

const usageOf = (raw: Json, long: number): Usage => ({
  input: Number(raw.input_tokens ?? 0),
  output: Number(raw.output_tokens ?? 0),
  cacheRead: Number(raw.cache_read_input_tokens ?? 0),
  cacheWrite: Number(raw.cache_creation_input_tokens ?? 0),
  ...(long && { cacheWriteLong: long }),
})

const longWrites = (raw: Json) => Number(fieldsOf(raw.cache_creation).ephemeral_1h_input_tokens ?? 0)

const resultText = (result: Json) => (typeof result.result === 'string' && result.result ? result.result : `Claude Code stopped: ${String(result.subtype)}`)

const resetOf = (info: Json) => {
  const seconds = Number(info.resetsAt)
  return seconds > 0 ? seconds * 1000 : undefined
}

const failureOf = (result: Json, { rejected, resetsAt }: Limit) =>
  rejected || result.api_error_status === 429 ? new UsageLimited(resultText(result), resetsAt) : new Error(resultText(result))

const createLimit = () => {
  let seen: Limit = { rejected: false }
  return {
    read(info: Json) {
      if (info.status !== 'rejected') return
      const reset = resetOf(info) ?? seen.resetsAt
      seen = { rejected: true, ...(reset && { resetsAt: Math.max(reset, seen.resetsAt ?? 0) }) }
    },
    take() {
      const taken = seen
      seen = { rejected: false }
      return taken
    },
  }
}

export const createReader = (output: AppOutput) => {
  let calls = 0
  let long = 0
  let stop: StopReason = 'end_turn'
  const limit = createLimit()

  const streamEvent = (event: Json) => {
    if (event.type === 'message_start') {
      calls = 0
      long = longWrites(fieldsOf(fieldsOf(event.message).usage))
    }
    if (event.type === 'content_block_delta') {
      const delta = fieldsOf(event.delta)
      if (delta.type === 'text_delta' && typeof delta.text === 'string') output.text(delta.text)
      if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string') output.thinking(delta.thinking)
    }
    if (event.type === 'message_delta') {
      const delta = fieldsOf(event.delta)
      if (typeof delta.stop_reason === 'string') stop = delta.stop_reason
      const raw = fieldsOf(event.usage)
      const usage = usageOf(raw, longWrites(raw) || long)
      output.usage(usage, writtenTtl(usage, cacheLifetimes.anthropic))
    }
    if (event.type === 'message_stop' && calls) output.pause()
  }

  const assistant = (message: Json) => {
    limit.read(fieldsOf(fieldsOf(message.api_error_params).rate_limit_info))
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
      if (message.type === 'rate_limit_event') limit.read(fieldsOf(message.rate_limit_info))
    },
    finish(result: Json) {
      const limited = limit.take()
      if (result.subtype === 'success' && !result.is_error) return output.finish(stop)
      output.fail(failureOf(result, limited))
    },
  }
}
