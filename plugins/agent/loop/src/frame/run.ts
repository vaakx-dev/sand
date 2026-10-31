import type { Message, Prompt, Session } from '@sand/chats/contract'
import { promptContent, textOf } from '@sand/chats/prompt'
import { emptyUsage } from '@sand/usage/records'
import type { LoopsContext } from '../context'
import { turnEnd, turnPrompt, turnReady, turnStart, type TurnEnding, type TurnResult } from '../contract'
import { runReact } from '../react'
import type { TurnHooks } from '../turn'
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

export const createFrame = (ctx: LoopsContext) => {
  const active = new Map<string, AbortController>()
  const started = new Set<string>()

  const open = async (session: Session, prompt: Prompt) => {
    const user: Message = { role: 'user', content: await ctx.waterfall(turnPrompt, promptContent(prompt), session) }
    started.add(session.id)
    session.append('message', user)
    ctx.emit(turnStart, session, user)
  }

  const run = async (session: Session, prompt: Prompt, external?: AbortSignal): Promise<TurnResult> => {
    if (active.has(session.id)) throw new Error('A turn is already running in this chat')
    const controller = new AbortController()
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const state: TurnState = { usage: emptyUsage(), sources: new Map(), stopReason: 'end_turn', reply: '', partial: createPartial() }
    const hooks = createHooks(ctx, session, signal, state)
    active.set(session.id, controller)
    const release = ctx.busy()
    let failure: { error: unknown } | undefined
    try {
      try {
        await open(session, prompt)
        await ctx.bail(turnReady, session, signal)
        signal.throwIfAborted()
        const outcome = await runReact({ signal, hooks })
        state.stopReason = outcome.stopReason
        state.reply = outcome.text
      } catch (error) {
        keepPartial(session, state)
        state.stopReason = signal.aborted ? 'interrupted' : 'error'
        if (!signal.aborted) failure = { error }
      }
      await appendLeftovers(session, hooks)
    } finally {
      active.delete(session.id)
      started.delete(session.id)
      release()
    }
    record(session, state, ctx.llm)
    const result = resultOf(state, failure)
    if (result.stopReason !== 'end_turn') session.append('turn-ending', { stopReason: result.stopReason, ...(result.error && { error: result.error }) } satisfies TurnEnding)
    ctx.emit(turnEnd, session, result)
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
