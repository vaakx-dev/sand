import type { Message, ToolCallBlock, ToolResultBlock } from '@sand/messages'

const failed = (call: ToolCallBlock, reason: string): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text: reason }],
  isError: true,
})

export const skip = (calls: ToolCallBlock[], reason: string) => calls.map(call => failed(call, reason))

export const callsOf = (message: Message) => message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call')
