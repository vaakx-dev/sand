import type { Session, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
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

const runTool = async (ctx: LoopsContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  if (signal.aborted) return errorResult(call, 'Not run: the user stopped the turn first.')
  ctx.emit(toolStart, call, session)
  const result = await runCall(ctx, call, session, signal)
  return ctx.waterfall(toolResult, result, call, session)
}

const batches = (calls: ToolCallBlock[], parallel: (call: ToolCallBlock) => boolean) =>
  calls.reduce<ToolCallBlock[][]>((found, call) => {
    const last = found.at(-1)
    if (last && parallel(call) && last.every(parallel)) last.push(call)
    else found.push([call])
    return found
  }, [])

export const runTools = async (ctx: LoopsContext, calls: ToolCallBlock[], session: Session, signal: AbortSignal) => {
  const results: ToolResultBlock[] = []
  for (const batch of batches(calls, call => ctx.tools.parallel(call, session)))
    results.push(...(await Promise.all(batch.map(call => runTool(ctx, call, session, signal)))))
  return results
}
