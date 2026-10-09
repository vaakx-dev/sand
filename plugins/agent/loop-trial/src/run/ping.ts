import type { Message, ToolCallBlock, ToolResultBlock } from '@sand/messages'
import type { Tool, Tools } from '@sand/tools/contract'
import { z } from 'zod'

export const pingName = 'trial_ping'

const ping: Tool = {
  name: pingName,
  description: 'Answers pong. Used to test an agent loop.',
  input: z.object({}),
  run: () => 'pong',
}

const spec = { name: pingName, description: ping.description, inputSchema: { type: 'object', properties: {} } }

const result = (call: ToolCallBlock, text: string, isError?: boolean): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text }],
  ...(isError && { isError }),
})

export const pingCalls = (messages: Message[]) =>
  new Set(messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_call' && block.name === pingName ? [block.id] : []))))

export const pingAnswered = (messages: Message[]) => {
  const calls = pingCalls(messages)
  return messages.some(message => message.content.some(block => block.type === 'tool_result' && calls.has(block.callId)))
}

export const trialTools = () => {
  let pings = 0
  const tools: Tools = {
    register: () => () => {},
    list: () => [ping],
    specs: () => [spec],
    notes: () => [],
    async run(call) {
      if (call.name !== pingName) return result(call, `No tool named ${call.name} in a loop trial`, true)
      pings++
      return result(call, 'pong')
    },
  }
  return { tools, pings: () => pings }
}
