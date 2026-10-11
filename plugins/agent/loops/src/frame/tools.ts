import type { ToolCallBlock, ToolResultBlock } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import { errorResult, untilAborted } from '@sand/kit'
import type { LoopsContext } from '../context'
import { markExternal } from './fault'

type Gate = { run: ToolCallBlock } | { result: ToolResultBlock }

const maxRewrites = 3

const decide = async (ctx: LoopsContext, call: ToolCallBlock, session: Session, signal: AbortSignal): Promise<Gate> => {
  let current = call
  for (let rewrites = 0; ; ) {
    const decision = await ctx.bail('tool.before', current, session, signal)
    if (!decision || decision.action === 'allow') return { run: current }
    if (decision.action === 'deny') return { result: errorResult(current, `Blocked by a hook: ${decision.reason}`) }
    if (decision.action === 'ask') {
      const approved = await ctx.bail('tool.approve', current, decision, session, signal)
      if (approved === true) return { run: current }
      if (approved === false) return { result: errorResult(current, `Not run: the user declined. ${decision.reason ?? ''}`.trim()) }
      return { result: errorResult(current, "Not run: this call needs the user's approval and no one can answer here.") }
    }
    current = { ...current, input: decision.input }
    if (++rewrites >= maxRewrites) return { run: current }
  }
}

const runCall = async (ctx: LoopsContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  try {
    return await untilAborted(ctx.tools.run(call, { cwd: session.cwd, signal, session }), signal)
  } catch (error) {
    if (signal.aborted) return errorResult(call, 'Interrupted: the user stopped the turn before this call finished.')
    throw markExternal(error)
  }
}

export const runTools = (ctx: LoopsContext, calls: ToolCallBlock[], session: Session, signal: AbortSignal) =>
  Promise.all(
    calls.map(async call => {
      const gate = await decide(ctx, call, session, signal)
      if ('result' in gate) return gate.result
      ctx.emit('tool.start', gate.run, session)
      const result = await runCall(ctx, gate.run, session, signal)
      return ctx.waterfall('tool.result', result, gate.run, session)
    }),
  )
