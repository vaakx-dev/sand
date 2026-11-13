import { errorResult, type ToolCallBlock, type ToolResultBlock } from '@sand/chats/contract'
import { concealBlock, type ToolContext } from '@sand/tools/contract'
import { errorMessage, untilAborted } from '@sand/util'
import { type Conversation, type Conversations, Interruption, toolContent } from '../contract'
import type { EngineContext } from '../context'

export interface Report {
  answer(result: ToolResultBlock): void
  output(call: ToolCallBlock, text: string): void
}

interface Calling {
  call: ToolCallBlock
  shown: ToolCallBlock
}

export type CallContext<C extends Conversation> = Omit<ToolContext, 'call' | 'progress' | 'conversation'> & { conversation: C }

const stoppedText = ({ reason }: AbortSignal, byUser: string) => (reason instanceof Interruption ? reason.note : byUser)

const interruptedText = (signal: AbortSignal) => stoppedText(signal, 'Interrupted: the user stopped the turn before this call finished.')

const notRunText = (signal: AbortSignal) => stoppedText(signal, 'Not run: the user stopped the turn first.')

const settle = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  { call, shown }: Calling,
  context: CallContext<C>,
  report: Report,
) => {
  const progress = (text: string) => {
    report.output(shown, text)
    conversations.toolProgress?.(shown, text, context.conversation)
  }
  try {
    return await untilAborted(ctx.tools.run(call, { ...context, progress }), context.signal)
  } catch (error) {
    if (context.signal.aborted) return errorResult(call, interruptedText(context.signal))
    return errorResult(call, errorMessage(error))
  }
}

const runCall = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  calling: Calling,
  context: CallContext<C>,
  report: Report,
) => {
  const result = await settle(ctx, conversations, calling, context, report)
  return { ...result, content: await ctx.waterfall(toolContent, result.content, context.conversation) }
}

const runTool = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  call: ToolCallBlock,
  context: CallContext<C>,
  report: Report,
) => {
  if (context.signal.aborted) return report.answer(errorResult(call, notRunText(context.signal)))
  const shown = concealBlock(call, ctx.tools.secrets())
  conversations.toolStarted?.(shown, context.conversation)
  const result = await runCall(ctx, conversations, { call, shown }, context, report)
  report.answer((await conversations.toolDone?.(result, shown, context.conversation)) ?? result)
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
  report: Report,
) => {
  for (const batch of batches(calls, call => ctx.tools.parallel(call, context.conversation)))
    await Promise.all(batch.map(call => runTool(ctx, conversations, call, context, report)))
}
