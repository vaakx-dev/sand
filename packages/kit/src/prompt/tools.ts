import type { Entry, Message, ToolCallBlock } from '@sand/protocol'

export const hasToolResult = (message: Message) => message.content.some(block => block.type === 'tool_result')

export const toolCalls = (entries: Iterable<Entry>) => {
  const calls = new Map<string, ToolCallBlock>()
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_call') calls.set(block.id, block)
  }
  return calls
}
