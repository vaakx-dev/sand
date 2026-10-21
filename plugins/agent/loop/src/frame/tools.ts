import type { Session, ToolCallBlock } from '@sand/chats/contract'
import { errorResult } from '@sand/chats/prompt'
import { toolFolder } from '@sand/tools/contract'
import { errorMessage, untilAborted } from '@sand/util'
import type { LoopsContext } from '../context'
import { toolProgress, toolResult, toolStart } from '../contract'

const runCall = async (ctx: LoopsContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  const progress = (text: string) => ctx.emit(toolProgress, call, text, session)
  try {
    const cwd = (await ctx.waterfall(toolFolder, session.cwd, session)) ?? session.cwd
    return await untilAborted(ctx.tools.run(call, { cwd, signal, session, progress }), signal)
  } catch (error) {
    if (signal.aborted) return errorResult(call, 'Interrupted: the user stopped the turn before this call finished.')
    return errorResult(call, errorMessage(error))
  }
}

export const runTools = (ctx: LoopsContext, calls: ToolCallBlock[], session: Session, signal: AbortSignal) =>
  Promise.all(
    calls.map(async call => {
      ctx.emit(toolStart, call, session)
      const result = await runCall(ctx, call, session, signal)
      return ctx.waterfall(toolResult, result, call, session)
    }),
  )
