import type { Block } from '@sand/messages'
import type { LLMEvent } from '../contract'

type Rename = (name: string) => string

const restoreBlock = (block: Block, original: Rename): Block => (block.type === 'tool_call' ? { ...block, name: original(block.name) } : block)

export async function* restoreNames(events: AsyncIterable<LLMEvent>, original: Rename): AsyncIterable<LLMEvent> {
  for await (const event of events) {
    if (event.type === 'tool_call') yield { ...event, name: original(event.name) }
    else if (event.type === 'block') yield { ...event, block: restoreBlock(event.block, original) }
    else if (event.type === 'done') yield { ...event, message: { ...event.message, content: event.message.content.map(block => restoreBlock(block, original)) } }
    else yield event
  }
}
