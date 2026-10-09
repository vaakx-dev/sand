import type { Message, ToolCallBlock, ToolResultBlock } from '@sand/messages'

const failed = (call: ToolCallBlock, reason: string): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text: reason }],
  isError: true,
})

export const skip = (calls: ToolCallBlock[], reason: string) => calls.map(call => failed(call, reason))

export const callsOf = (message: Message) => message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call')

export const textOf = (message: Message) =>
  message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

export const refused = 'Not run: the response was refused.'

export const truncated = 'Not run: the response hit max_tokens before this call was complete. Retry with a smaller input.'
