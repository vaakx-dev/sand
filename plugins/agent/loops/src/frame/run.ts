import { emptyUsage, promptContent, textOf } from '@sand/kit'
import type { Entry, Message, Prompt } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { LoopsContext } from '../context'
import type { LoopImpl, TurnEnding, TurnHooks, TurnResult } from '../contract'
import type { Faults } from '../faults'
import { isFault } from './fault'
import { createHooks } from './hooks'
import { createPartial } from './partial'
import { resultOf } from './result'
import type { TurnState } from './state'
import { record } from './usage'

const keepPartial = (session: Session, state: TurnState) => {
  const message = state.partial.message()
  if (!message) return
  session.append('message', message)
  state.reply = textOf(message.content)
}

const appendLeftovers = async (session: Session, hooks: TurnHooks) => {
  const rest = await hooks.inbox()
  if (rest.length) session.append('message', { role: 'user', content: rest })
}

export const createFrame = (ctx: LoopsContext, resolve: (session: Session) => LoopImpl, faults: Faults) => {
  const active = new Map<string, AbortController>()
  const started = new Set<string>()

  const open = async (session: Session, prompt: Prompt, signal: AbortSignal, state: TurnState) => {
    await ctx.waterfall('turn.prepare', session, signal)
    const user: Message = { role: 'user', content: await ctx.waterfall('turn.prompt', promptContent(prompt), session) }
    started.add(session.id)
    const opening = session.append('message', user)
    ctx.emit('turn.start', session, user)
    state.choice = await ctx.bail('model.choose', session, user)
    return { user, opening }
  }

  const run = async (session: Session, prompt: Prompt, external?: AbortSignal): Promise<TurnResult> => {
    if (active.has(session.id)) throw new Error('A turn is already running in this thread')
    const controller = new AbortController()
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const state: TurnState = { usage: emptyUsage(), sources: new Map(), stopReason: 'end_turn', reply: '', partial: createPartial() }
    const hooks = createHooks(ctx, session, signal, state)
    active.set(session.id, controller)
    const release = ctx.busy()
    let failure: { error: unknown } | undefined
    let chosen: { impl: LoopImpl; opening: Entry } | undefined
    try {
      try {
        const { user, opening } = await open(session, prompt, signal, state)
        chosen = { impl: resolve(session), opening }
        const outcome = await chosen.impl.run({ session, user, signal, hooks })
        state.stopReason = outcome.stopReason
        state.reply = outcome.text
      } catch (error) {
        keepPartial(session, state)
        state.stopReason = signal.aborted ? 'interrupted' : 'error'
        if (!signal.aborted) failure = { error }
      }
      await appendLeftovers(session, hooks)
      if (chosen && failure && isFault(failure.error, signal)) faults.fault(session, chosen.impl, failure.error, chosen.opening)
    } finally {
      active.delete(session.id)
      started.delete(session.id)
      release()
    }
    record(session, state, ctx.llm)
    const result = resultOf(state, failure)
    if (result.stopReason !== 'end_turn') session.append('turn-ending', { stopReason: result.stopReason, ...(result.error && { error: result.error }) } satisfies TurnEnding)
    ctx.emit('turn.end', session, result)
    if (failure) throw failure.error
    return result
  }

  return {
    run,
    interrupt(session: Session) {
      const controller = active.get(session.id)
      controller?.abort()
      return Boolean(controller)
    },
    active: (session: Session) => active.has(session.id),
    started: (session: Session) => started.has(session.id),
  }
}
