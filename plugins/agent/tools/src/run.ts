import type { ToolCallBlock, ToolResultBlock } from '@sand/messages'
import type { Tool, ToolContext } from './contract'
import { errorMessage } from '@sand/kit'
import { z } from 'zod'

const result = (call: ToolCallBlock, text: string, isError?: boolean): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text: text || '(no output)' }],
  ...(isError ? { isError } : {}),
})

export const run = async (
  tool: Tool<any> | undefined,
  call: ToolCallBlock,
  context: Omit<ToolContext, 'call'>,
): Promise<ToolResultBlock> => {
  if (!tool) return result(call, `Unknown tool: ${call.name}`, true)
  if (call.malformed !== undefined) return result(call, JSON.stringify({ INVALID_JSON: call.malformed }), true)
  const parsed = tool.input.safeParse(call.input)
  if (!parsed.success) return result(call, `Invalid input:\n${z.prettifyError(parsed.error)}`, true)
  try {
    const output = await tool.run(parsed.data, { ...context, call })
    if (typeof output === 'string') return result(call, output)
    return { type: 'tool_result', callId: call.id, content: output }
  } catch (error) {
    return result(call, errorMessage(error), true)
  }
}
