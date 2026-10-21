import type { Entry, Message, ToolCallBlock } from '@sand/chats/contract'
import { isRecord } from '@sand/util'

export type Calls = Map<string, ToolCallBlock>

export const toolCalls = (entries: Iterable<Entry>): Calls => {
  const calls: Calls = new Map()
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_call') calls.set(block.id, block)
  }
  return calls
}

export const inputText = (input: unknown, key: string) => {
  const value = isRecord(input) ? input[key] : undefined
  return typeof value === 'string' ? value : ''
}
