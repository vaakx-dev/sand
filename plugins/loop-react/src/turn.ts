import type { Message, Prompt, Session, TurnResult, UserContent } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { createPartial } from './partial'
import { appendSteering, drain, step } from './step'
import type { LoopContext, Turn, TurnRun } from './types'
import { empty, record } from './usage'

export const content = (prompt: Prompt): UserContent[] => (typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt)

interface Failure {
  error: unknown
}

const start = async ({ ctx, session }: TurnRun, prompt: Prompt) => {
  const user: Message = { role: 'user', content: await ctx.waterfall('turn.prompt', content(prompt), session) }
  session.append('message', user)
  ctx.emit('turn.start', session, user)
}

const keepPartial = ({ session, progress, partial }: TurnRun) => {
  const message = partial.message()
  if (!message) return
  session.append('message', message)
  progress.reply = message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')
}

const resultOf = ({ progress }: TurnRun, failure?: Failure): TurnResult => ({
  stopReason: progress.stopReason,
  usage: progress.usage,
  text: progress.reply,
  ...(failure && { error: errorMessage(failure.error) }),
})

const proceed = async (run: TurnRun) => {
  const { ctx, session, signal } = run
  if (await appendSteering(run)) return true
  const next = await ctx.bail('turn.stop', session, resultOf(run), signal)
  signal.throwIfAborted()
  if (!next?.length) return appendSteering(run)
  session.append('message', { role: 'user', content: [...next, ...(await drain(run))] })
  ctx.emit('turn.continue', session, next)
  return true
}

const finish = (run: TurnRun, failure?: Failure): TurnResult => {
  const { ctx, session, progress } = run
  record(session, progress.usage, progress.model)
  const result = resultOf(run, failure)
  ctx.emit('turn.end', session, result)
  if (failure) throw failure.error
  return result
}

export const runTurn = async (
  ctx: LoopContext,
  turns: Map<string, Turn>,
  session: Session,
  prompt: Prompt,
  external?: AbortSignal,
): Promise<TurnResult> => {
  if (turns.has(session.id)) throw new Error('A turn is already running in this thread')
  const turn: Turn = { queue: [], controller: new AbortController() }
  const signal = external ? AbortSignal.any([external, turn.controller.signal]) : turn.controller.signal
  const run: TurnRun = {
    ctx,
    session,
    turn,
    signal,
    progress: { usage: empty(), stopReason: 'end_turn', reply: '' },
    partial: createPartial(),
  }
  turns.set(session.id, turn)
  const release = ctx.busy()
  let failure: Failure | undefined
  try {
    await start(run, prompt)
    do {
      let more = true
      while (more) more = await step(run)
    } while (await proceed(run))
  } catch (error) {
    keepPartial(run)
    await appendSteering(run)
    run.progress.stopReason = signal.aborted ? 'interrupted' : 'error'
    if (!signal.aborted) failure = { error }
  } finally {
    turns.delete(session.id)
    release()
  }
  return finish(run, failure)
}
