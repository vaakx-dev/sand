import type { Block, TextBlock, ThinkingBlock, ToolCallBlock } from '@sand/messages'
import type { LLMEvent } from '../contract'
import { parseToolInput } from '../http/tool-input'
import type { ToolCallDelta } from './chunks'

interface Slot<T extends Block> {
  index: number
  block: T
}

interface CallSlot extends Slot<ToolCallBlock> {
  json: string
  announced: boolean
}

const keyOf = (delta: ToolCallDelta | null, position: number) => {
  if (typeof delta?.index === 'number') return `#${delta.index}`
  if (typeof delta?.id === 'string' && delta.id) return `id:${delta.id}`
  return `@${position}`
}

const piece = (value: unknown) => (typeof value === 'string' ? value : value && typeof value === 'object' ? JSON.stringify(value) : '')

const blockEvent = ({ index, block }: Slot<Block>): LLMEvent => ({ type: 'block', index, block })

export class Collector {
  readonly blocks: Block[] = []
  private current: Slot<TextBlock | ThinkingBlock> | undefined
  private calls = new Map<string, CallSlot>()

  private add<T extends Block>(block: T): Slot<T> {
    this.blocks.push(block)
    return { index: this.blocks.length - 1, block }
  }

  private close(): LLMEvent[] {
    const slot = this.current
    this.current = undefined
    return slot ? [blockEvent(slot)] : []
  }

  private announce(slot: CallSlot): LLMEvent[] {
    const { block, index, json } = slot
    slot.announced = true
    if (!block.id) block.id = `call_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`
    return [{ type: 'tool_call', index, id: block.id, name: block.name }, ...(json ? [{ type: 'tool_input' as const, index, json }] : [])]
  }

  private finishCall(slot: CallSlot): LLMEvent[] {
    const events = slot.announced ? [] : this.announce(slot)
    parseToolInput(slot.block, slot.json)
    return [...events, blockEvent(slot)]
  }

  text(kind: 'text' | 'thinking', text: string): LLMEvent[] {
    const events: LLMEvent[] = []
    if (this.current?.block.type !== kind) {
      events.push(...this.close())
      const block: TextBlock | ThinkingBlock = kind === 'text' ? { type: 'text', text: '' } : { type: 'thinking', thinking: '' }
      this.current = this.add(block)
    }
    const { block, index } = this.current
    if (block.type === 'text') block.text += text
    else block.thinking += text
    events.push({ type: kind, index, text })
    return events
  }

  tool(delta: ToolCallDelta | null, position: number): LLMEvent[] {
    const key = keyOf(delta, position)
    const events: LLMEvent[] = []
    let slot = this.calls.get(key)
    if (!slot) {
      events.push(...this.close())
      slot = { ...this.add<ToolCallBlock>({ type: 'tool_call', id: '', name: '', input: {} }), json: '', announced: false }
      this.calls.set(key, slot)
    }
    const { block } = slot
    if (!slot.announced && !block.id && typeof delta?.id === 'string') block.id = delta.id
    if (!block.name && typeof delta?.function?.name === 'string') block.name = delta.function.name
    const json = piece(delta?.function?.arguments)
    slot.json += json
    if (!slot.announced && block.name) events.push(...this.announce(slot))
    else if (slot.announced && json) events.push({ type: 'tool_input', index: slot.index, json })
    return events
  }

  finish(): LLMEvent[] {
    const slots = [...(this.current ? [this.current] : []), ...this.calls.values()].sort((a, b) => a.index - b.index)
    this.current = undefined
    this.calls.clear()
    return slots.flatMap(slot => ('json' in slot ? this.finishCall(slot) : [blockEvent(slot)]))
  }

  get hasCalls() {
    return this.blocks.some(block => block.type === 'tool_call')
  }
}
