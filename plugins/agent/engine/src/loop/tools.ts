import { errorResult, type ToolCallBlock, type ToolResultBlock } from '@sand/chats/contract'
import type { ToolContext } from '@sand/tools/contract'
import { errorMessage, untilAborted } from '@sand/util'
import { type Conversation, type Conversations, HandedOver } from '../contract'
import type { EngineContext } from '../context'

type Answer = (result: ToolResultBlock) => void

export type CallContext<C extends Conversation> = Omit<ToolContext, 'call' | 'progress' | 'conversation'> & { conversation: C }

const runCall = async <C extends Conversation>(ctx: EngineContext, conversations: Conversations<C>, call: ToolCallBlock, context: CallContext<C>) => {
  const progress = (text: string) => conversations.toolProgress?.(call, text, context.conversation)
  try {
    return await untilAborted(ctx.tools.run(call, { ...context, progress }), context.signal)
  } catch (error) {
    if (context.signal.reason instanceof HandedOver) throw error
    if (context.signal.aborted) return errorResult(call, 'Interrupted: the user stopped the turn before this call finished.')
    return errorResult(call, errorMessage(error))
  }
}

const runTool = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  call: ToolCallBlock,
  context: CallContext<C>,
  answer: Answer,
) => {
  if (context.signal.aborted) return answer(errorResult(call, 'Not run: the user stopped the turn first.'))
  conversations.toolStarted?.(call, context.conversation)
  const result = await runCall(ctx, conversations, call, context)
  answer((await conversations.toolDone?.(result, call, context.conversation)) ?? result)
}

const batches = (calls: ToolCallBlock[], parallel: (call: ToolCallBlock) => boolean) =>
  calls.reduce<ToolCallBlock[][]>((found, call) => {
    const last = found.at(-1)
    if (last && parallel(call) && last.every(parallel)) last.push(call)
    else found.push([call])
    return found
  }, [])

export const runTools = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  calls: ToolCallBlock[],
  context: CallContext<C>,
  answer: Answer,
) => {
  for (const batch of batches(calls, call => ctx.tools.parallel(call, context.conversation)))
    await Promise.all(batch.map(call => runTool(ctx, conversations, call, context, answer)))
}
