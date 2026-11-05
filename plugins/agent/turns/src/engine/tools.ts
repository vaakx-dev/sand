import { errorResult, type ToolCallBlock, type ToolResultBlock } from '@sand/chats/contract'
import type { ToolContext } from '@sand/tools/contract'
import { toolProgress, toolResult, toolStart } from '@sand/turns-contract/contract'
import { errorMessage, untilAborted } from '@sand/util'
import type { TurnsContext } from '../context'

type Answer = (result: ToolResultBlock) => void

export type CallContext = Omit<ToolContext, 'call' | 'progress'>

const runCall = async (ctx: TurnsContext, call: ToolCallBlock, context: CallContext) => {
  const progress = (text: string) => ctx.emit(toolProgress, call, text, context.session)
  try {
    return await untilAborted(ctx.tools.run(call, { ...context, progress }), context.signal)
  } catch (error) {
    if (context.signal.aborted) return errorResult(call, 'Interrupted: the user stopped the turn before this call finished.')
    return errorResult(call, errorMessage(error))
  }
}

const runTool = async (ctx: TurnsContext, call: ToolCallBlock, context: CallContext, answer: Answer) => {
  if (context.signal.aborted) return answer(errorResult(call, 'Not run: the user stopped the turn first.'))
  ctx.emit(toolStart, call, context.session)
  const result = await runCall(ctx, call, context)
  answer(await ctx.waterfall(toolResult, result, call, context.session))
}

const batches = (calls: ToolCallBlock[], parallel: (call: ToolCallBlock) => boolean) =>
  calls.reduce<ToolCallBlock[][]>((found, call) => {
    const last = found.at(-1)
    if (last && parallel(call) && last.every(parallel)) last.push(call)
    else found.push([call])
    return found
  }, [])

export const runTools = async (ctx: TurnsContext, calls: ToolCallBlock[], context: CallContext, answer: Answer) => {
  for (const batch of batches(calls, call => ctx.tools.parallel(call, context.session)))
    await Promise.all(batch.map(call => runTool(ctx, call, context, answer)))
}
