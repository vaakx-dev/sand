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

const runTool = async (ctx: LoopsContext, call: ToolCallBlock, session: Session, signal: AbortSignal) => {
  if (signal.aborted) return errorResult(call, 'Not run: the user stopped the turn first.')
  const gate = await decide(ctx, call, session, signal)
  if ('result' in gate) return gate.result
  ctx.emit('tool.start', gate.run, session)
  const result = await runCall(ctx, gate.run, session, signal)
  return ctx.waterfall('tool.result', result, gate.run, session)
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
