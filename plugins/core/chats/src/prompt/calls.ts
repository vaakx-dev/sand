import type { Message, ToolCallBlock, ToolResultBlock } from '../contract'

export const refused = 'Not run: the response was refused.'

export const truncated = 'Not run: the response hit max_tokens before this call was complete. Retry with a smaller input.'

export const errorResult = (call: ToolCallBlock, text: string): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text }],
  isError: true,
})

export const skip = (calls: ToolCallBlock[], reason: string) => calls.map(call => errorResult(call, reason))

export const callsOf = (message: Message) => message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call')
