import type { ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { Tool, ToolContext } from './contract'
import { errorMessage, plural, untilAborted } from '@sand/util'
import { z } from 'zod'

const defaultTimeoutMs = 120_000

const result = (call: ToolCallBlock, text: string, isError?: boolean): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text: text || '(no output)' }],
  ...(isError ? { isError } : {}),
})

const stoppedText = (tool: Tool, timeoutMs: number) =>
  `${tool.name} was stopped after ${plural(timeoutMs / 60_000, 'minute')}, its time limit. Its work may be half done: check what it changed before retrying, and split slow work into smaller steps.`

export const run = async (
  tool: Tool | undefined,
  call: ToolCallBlock,
  context: Omit<ToolContext, 'call'>,
): Promise<ToolResultBlock> => {
  if (!tool) return result(call, `Unknown tool: ${call.name}`, true)
  if (call.malformed !== undefined) return result(call, JSON.stringify({ INVALID_JSON: call.malformed }), true)
  const parsed = tool.input.safeParse(call.input)
  if (!parsed.success) return result(call, `Invalid input:\n${z.prettifyError(parsed.error)}`, true)
  const timeoutMs = tool.timeoutMs ?? defaultTimeoutMs
  const deadline = new AbortController()
  const timer = setTimeout(() => deadline.abort(), timeoutMs)
  const signal = AbortSignal.any([context.signal, deadline.signal])
  try {
    const output = await untilAborted(
      Promise.try(() => tool.run(parsed.data, { ...context, signal, call })),
      deadline.signal,
    )
    if (typeof output === 'string') return result(call, output)
    return { type: 'tool_result', callId: call.id, content: output }
  } catch (error) {
    if (deadline.signal.aborted) return result(call, stoppedText(tool, timeoutMs), true)
    return result(call, errorMessage(error), true)
  } finally {
    clearTimeout(timer)
  }
}
