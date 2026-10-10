import type { Block, ToolCallBlock } from '@sand/messages'
import type { LLMEvent } from '../contract'

interface Slot {
  index: number
  block: Block
  json: string
  announced: boolean
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

const keyOf = (delta: any, position: number) =>
  typeof delta?.index === 'number' ? `#${delta.index}` : typeof delta?.id === 'string' && delta.id ? `id:${delta.id}` : `@${position}`

const piece = (value: unknown) => (typeof value === 'string' ? value : value && typeof value === 'object' ? JSON.stringify(value) : '')

export class Collector {
  readonly blocks: Block[] = []
  private current: Slot | undefined
  private calls = new Map<string, Slot>()

  private add(block: Block): Slot {
    const slot = { index: this.blocks.length, block, json: '', announced: false }
    this.blocks.push(block)
    return slot
  }

  private close(): LLMEvent[] {
    const slot = this.current
    this.current = undefined
    return slot ? [{ type: 'block', index: slot.index, block: slot.block }] : []
  }

  private announce(slot: Slot): LLMEvent[] {
    const block = slot.block as ToolCallBlock
    slot.announced = true
    if (!block.id) block.id = `call_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`
    return [{ type: 'tool_call', index: slot.index, id: block.id, name: block.name }, ...(slot.json ? [{ type: 'tool_input' as const, index: slot.index, json: slot.json }] : [])]
  }

  text(kind: 'text' | 'thinking', text: string): LLMEvent[] {
    const events: LLMEvent[] = []
    if (this.current?.block.type !== kind) {
      events.push(...this.close())
      this.current = this.add(kind === 'text' ? { type: 'text', text: '' } : { type: 'thinking', thinking: '' })
    }
    const { block, index } = this.current
    if (block.type === 'text') block.text += text
    else if (block.type === 'thinking') block.thinking += text
    events.push({ type: kind, index, text })
    return events
  }

  tool(delta: any, position: number): LLMEvent[] {
    const key = keyOf(delta, position)
    const events: LLMEvent[] = []
    let slot = this.calls.get(key)
    if (!slot) {
      events.push(...this.close())
      slot = this.add({ type: 'tool_call', id: '', name: '', input: {} })
      this.calls.set(key, slot)
    }
    const block = slot.block as ToolCallBlock
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
    return slots.flatMap(slot => {
      if (slot.block.type !== 'tool_call') return [{ type: 'block', index: slot.index, block: slot.block }]
      const events = slot.announced ? [] : this.announce(slot)
      parseInput(slot.block, slot.json)
      return [...events, { type: 'block', index: slot.index, block: slot.block }]
    })
  }

  get hasCalls() {
    return this.blocks.some(block => block.type === 'tool_call')
  }
}
