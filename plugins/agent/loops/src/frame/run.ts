import type { Entry, Message, Prompt, UserContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { LoopsContext } from '../context'
import type { LoopImpl, RunOverrides, TurnHooks, TurnResult } from '../contract'
import { isFault } from './fault'
import { createHooks, textOf } from './hooks'
import { createPartial } from './partial'
import { resultOf } from './result'
import type { TurnState } from './state'
import { empty, record } from './usage'

export interface FrameOptions {
  impl?: LoopImpl
  signal?: AbortSignal
  overrides?: RunOverrides
}

export const content = (prompt: Prompt): UserContent[] => (typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt)

const keepPartial = (session: Session, state: TurnState) => {
  const message = state.partial.message()
  if (!message) return
  session.append('message', message)
  state.reply = textOf(message)
}

const appendLeftovers = async (session: Session, hooks: TurnHooks) => {
  const rest = await hooks.inbox()
  if (rest.length) session.append('message', { role: 'user', content: rest })
}

export interface FaultSink {
  fault(session: Session, impl: LoopImpl, error: unknown, opening: Entry): void
}

interface Chosen {
  impl: LoopImpl
  opening: Entry
}

export const createFrame = (ctx: LoopsContext, resolve: (session: Session) => LoopImpl, faults: FaultSink) => {
  const active = new Map<string, AbortController>()

  const run = async (session: Session, prompt: Prompt, options: FrameOptions = {}): Promise<TurnResult> => {
    if (active.has(session.id)) throw new Error('A turn is already running in this thread')
    const controller = new AbortController()
    const external = options.signal ?? options.overrides?.signal
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const state: TurnState = { usage: empty(), sources: new Map(), stopReason: 'end_turn', reply: '', partial: createPartial() }
    const hooks = createHooks(ctx, session, signal, options.overrides ?? {}, state)
    active.set(session.id, controller)
    const release = ctx.busy()
    let failure: { error: unknown } | undefined
    let chosen: Chosen | undefined
    try {
      try {
        await ctx.waterfall('turn.prepare', session, signal)
        const user: Message = { role: 'user', content: await ctx.waterfall('turn.prompt', content(prompt), session) }
        const opening = session.append('message', user)
        ctx.emit('turn.start', session, user)
        state.choice = await ctx.bail('model.choose', session, user)
        if (!options.impl) chosen = { impl: resolve(session), opening }
        const impl = options.impl ?? chosen?.impl
        if (!impl) throw new Error('No agent loop is loaded')
        const outcome = await impl.run({ session, user, signal, hooks })
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
      release()
    }
    record(session, state, options.overrides?.llm ?? ctx.llm)
    const result = resultOf(state, failure)
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
  }
}
