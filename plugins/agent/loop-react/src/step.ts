import type { Message, StopReason, ToolCallBlock, ToolResultBlock, UserContent } from '@sand/protocol'
import { execute, skip } from './calls'
import { stream } from './stream'
import type { TurnRun } from './types'
import { add } from './usage'

const callsOf = (message: Message) => message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call')

const textOf = (message: Message) =>
  message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

export const drain = async ({ ctx, session, turn }: TurnRun) => {
  const drained: UserContent[] = []
  const taken = turn.queue.splice(0)
  if (taken.length) ctx.emit('turn.queue', session)
  for (const steer of taken) {
    const expanded = await ctx.waterfall('turn.prompt', steer.prompt, session)
    ctx.emit('turn.steer', session, expanded, steer.id)
    drained.push(...expanded)
  }
  return drained
}

export const appendSteering = async (run: TurnRun) => {
  const steering = await drain(run)
  if (!steering.length) return false
  run.session.append('message', { role: 'user', content: steering })
  return true
}

const answer = async (run: TurnRun, results: ToolResultBlock[]) => {
  run.session.append('message', { role: 'user', content: [...results, ...(await drain(run))] })
}

const respond = async (run: TurnRun, message: Message, stopReason: StopReason) => {
  const pending = callsOf(message)
  if (!pending.length) return stopReason === 'pause_turn' || appendSteering(run)
  if (stopReason === 'refusal') {
    await answer(run, skip(pending, 'Not run: the response was refused.'))
    return false
  }
  const results =
    stopReason === 'max_tokens'
      ? skip(pending, 'Not run: the response hit max_tokens before this call was complete. Retry with a smaller input.')
      : await execute(run.ctx, pending, run.session, run.signal)
  await answer(run, results)
  return true
}

const send = async (run: TurnRun) => {
  const { ctx, session, signal, progress } = run
  const request = await ctx.waterfall('context.build', await ctx.context.build(session), session, signal)
  progress.model = request.model
  return stream(run, request)
}

const recover = async (run: TurnRun, error: unknown) => {
  const { ctx, session, signal } = run
  if (signal.aborted || !(await ctx.bail('context.overflow', session, error, signal))) throw error
  return send(run)
}

export const step = async (run: TurnRun) => {
  const { ctx, session, signal, progress } = run
  signal.throwIfAborted()
  const done = await send(run).catch(error => recover(run, error))
  const message = await ctx.waterfall('llm.response', done.message, session)
  session.append('message', message)
  run.partial.clear()
  progress.usage = add(progress.usage, done.usage)
  progress.stopReason = done.stopReason
  progress.reply = textOf(message)
  return respond(run, message, done.stopReason)
}
