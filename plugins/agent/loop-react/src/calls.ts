import type { Session, ToolCallBlock, ToolResultBlock } from '@sand/protocol'
import { untilAborted } from '@sand/kit'
import type { LoopContext } from './types'

const failed = (call: ToolCallBlock, reason: string): ToolResultBlock => ({
  type: 'tool_result',
  callId: call.id,
  content: [{ type: 'text', text: reason }],
  isError: true,
})

export const skip = (calls: ToolCallBlock[], reason: string) => calls.map(call => failed(call, reason))

const runCall = async (ctx: LoopContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  try {
    return await untilAborted(ctx.tools.run(call, { cwd: session.cwd, signal, session }), signal)
  } catch (error) {
    if (signal.aborted) return failed(call, 'Interrupted: the user stopped the turn before this call finished.')
    throw error
  }
}

export const execute = (ctx: LoopContext, calls: ToolCallBlock[], session: Session, signal: AbortSignal) =>
  Promise.all(
    calls.map(async call => {
      ctx.emit('tool.start', call, session)
      const result = await runCall(ctx, call, session, signal)
      return ctx.waterfall('tool.result', result, call, session)
    }),
  )
