import { errorResult, type Session, type ToolCallBlock, type ToolResultBlock } from '@sand/chats/contract'
import { toolProgress, toolResult, toolStart } from '@sand/loop/contract'
import { errorMessage, untilAborted } from '@sand/util'
import type { TurnsContext } from '../context'

type Answer = (result: ToolResultBlock) => void

const runCall = async (ctx: TurnsContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  const progress = (text: string) => ctx.emit(toolProgress, call, text, session)
  try {
    return await untilAborted(ctx.tools.run(call, { cwd: session.cwd, signal, session, progress }), signal)
  } catch (error) {
    if (signal.aborted) return errorResult(call, 'Interrupted: the user stopped the turn before this call finished.')
    return errorResult(call, errorMessage(error))
  }
}

const runTool = async (ctx: TurnsContext, call: ToolCallBlock, session: Session, signal: AbortSignal, answer: Answer) => {
  if (signal.aborted) return answer(errorResult(call, 'Not run: the user stopped the turn first.'))
  ctx.emit(toolStart, call, session)
  const result = await runCall(ctx, call, session, signal)
  answer(await ctx.waterfall(toolResult, result, call, session))
}

const batches = (calls: ToolCallBlock[], parallel: (call: ToolCallBlock) => boolean) =>
  calls.reduce<ToolCallBlock[][]>((found, call) => {
    const last = found.at(-1)
    if (last && parallel(call) && last.every(parallel)) last.push(call)
    else found.push([call])
    return found
  }, [])

export const runTools = async (ctx: TurnsContext, calls: ToolCallBlock[], session: Session, signal: AbortSignal, answer: Answer) => {
  for (const batch of batches(calls, call => ctx.tools.parallel(call, session)))
    await Promise.all(batch.map(call => runTool(ctx, call, session, signal, answer)))
}
