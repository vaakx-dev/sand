import type { Block, LLMEvent, StopReason, ToolCallBlock, Usage } from '@sand/protocol'
import { encodeReasoning } from '../reasoning'

interface Slot {
  index: number
  block: Block
  json: string
}

const blockOf = (item: any): Block | undefined => {
  switch (item?.type) {
    case 'reasoning':
      return { type: 'thinking', thinking: '' }
    case 'message':
      return { type: 'text', text: '' }
    case 'function_call':
      return { type: 'tool_call', id: item.call_id, name: item.name, input: {} }
  }
}

const parseInput = (block: ToolCallBlock, json: string) => {
  if (!json.trim()) return
  try {
    const input = JSON.parse(json)
    if (input && typeof input === 'object' && !Array.isArray(input)) block.input = input
    else block.malformed = json
  } catch {
    block.malformed = json
  }
}

const texts = (parts: any[] | undefined, key: string) => (parts ?? []).map(part => part?.[key] ?? '').join('\n\n')

const usageOf = (raw: any): Usage => {
  const cached = raw?.input_tokens_details?.cached_tokens ?? 0
  return { input: Math.max(0, (raw?.input_tokens ?? 0) - cached), output: raw?.output_tokens ?? 0, cacheRead: cached, cacheWrite: 0 }
}

const stopOf = (response: any, calls: boolean): StopReason => {
  const reason = response?.incomplete_details?.reason
  if (response?.status === 'incomplete') return reason === 'max_output_tokens' ? 'max_tokens' : reason === 'content_filter' ? 'refusal' : (reason ?? 'incomplete')
  return calls ? 'tool_use' : 'end_turn'
}

const failure = (event: any) => {
  const error = event.response?.error ?? event.error ?? event
  return new Error(`ChatGPT error: ${error?.message ?? error?.code ?? JSON.stringify(event)}`)
}

export async function* readCodex(stream: AsyncIterable<any>, model: string): AsyncIterable<LLMEvent> {
  const slots = new Map<number, Slot>()
  const blocks: Block[] = []
  const reasoning = new Map<string, { block: Block; item: any }>()
  let started = false

  const open = (outputIndex: number, item: any) => {
    const existing = slots.get(outputIndex)
    if (existing) return { slot: existing, fresh: false }
    const block = blockOf(item)
    if (!block) return undefined
    const slot = { index: blocks.length, block, json: item?.arguments ?? '' }
    blocks.push(block)
    slots.set(outputIndex, slot)
    return { slot, fresh: true }
  }

  for await (const event of stream) {
    if (!started) {
      started = true
      yield { type: 'start', model: event.response?.model ?? model }
    }
    const slot = slots.get(event.output_index)
    switch (event.type) {
      case 'response.output_item.added': {
        const opened = open(event.output_index, event.item)
        if (opened?.fresh && opened.slot.block.type === 'tool_call') {
          yield { type: 'tool_call', index: opened.slot.index, id: opened.slot.block.id, name: opened.slot.block.name }
        }
        break
      }
      case 'response.reasoning_summary_part.added':
        if (slot?.block.type === 'thinking' && event.summary_index > 0) {
          slot.block.thinking += '\n\n'
          yield { type: 'thinking', index: slot.index, text: '\n\n' }
        }
        break
      case 'response.reasoning_summary_text.delta':
      case 'response.reasoning_text.delta':
        if (slot?.block.type === 'thinking' && event.delta) {
          slot.block.thinking += event.delta
          yield { type: 'thinking', index: slot.index, text: event.delta }
        }
        break
      case 'response.output_text.delta':
      case 'response.refusal.delta':
        if (slot?.block.type === 'text' && event.delta) {
          slot.block.text += event.delta
          yield { type: 'text', index: slot.index, text: event.delta }
        }
        break
      case 'response.function_call_arguments.delta':
        if (slot?.block.type === 'tool_call' && event.delta) {
          slot.json += event.delta
          yield { type: 'tool_input', index: slot.index, json: event.delta }
        }
        break
      case 'response.function_call_arguments.done':
        if (slot?.block.type === 'tool_call' && typeof event.arguments === 'string') {
          const rest = event.arguments.startsWith(slot.json) ? event.arguments.slice(slot.json.length) : ''
          slot.json = event.arguments
          if (rest) yield { type: 'tool_input', index: slot.index, json: rest }
        }
        break
      case 'response.output_item.done': {
        const opened = open(event.output_index, event.item)
        if (!opened) break
        const { slot: done, fresh } = opened
        const item = event.item
        const block = done.block
        if (block.type === 'thinking') {
          block.thinking = texts(item.summary, 'text') || texts(item.content, 'text') || block.thinking
          block.signature = encodeReasoning(item)
          if (item.id) reasoning.set(item.id, { block, item })
        } else if (block.type === 'text') {
          block.text = (item.content ?? []).map((part: any) => part?.text ?? part?.refusal ?? '').join('') || block.text
        } else if (block.type === 'tool_call') {
          if (fresh) yield { type: 'tool_call', index: done.index, id: block.id, name: block.name }
          parseInput(block, item.arguments ?? done.json)
        }
        slots.delete(event.output_index)
        yield { type: 'block', index: done.index, block }
        break
      }
      case 'response.completed':
      case 'response.done':
      case 'response.incomplete': {
        for (const item of event.response?.output ?? []) {
          const found = item?.type === 'reasoning' && item.encrypted_content ? reasoning.get(item.id) : undefined
          if (found?.block.type === 'thinking' && !found.item.encrypted_content) {
            found.block.signature = encodeReasoning({ ...found.item, encrypted_content: item.encrypted_content })
          }
        }
        const calls = blocks.some(block => block.type === 'tool_call')
        yield { type: 'done', message: { role: 'assistant', content: blocks }, stopReason: stopOf(event.response, calls), usage: usageOf(event.response?.usage) }
        return
      }
      case 'response.failed':
      case 'error':
        throw failure(event)
    }
  }
  throw new Error('ChatGPT stream ended before the response finished')
}
