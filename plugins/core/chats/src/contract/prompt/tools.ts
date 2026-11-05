import type { Entry, Message, ToolCallBlock } from '..'

export const hasToolResult = (message: Message) => message.content.some(block => block.type === 'tool_result')

export const isPrompt = (entry: Entry) => {
  if (entry.type !== 'message') return false
  const message = entry.data as Message
  return message.role === 'user' && !hasToolResult(message)
}

export const toolCalls = (entries: Iterable<Entry>) => {
  const calls = new Map<string, ToolCallBlock>()
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_call') calls.set(block.id, block)
  }
  return calls
}
