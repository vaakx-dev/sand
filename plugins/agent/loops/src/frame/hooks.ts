import { textOf } from '@sand/kit'
import type { LLMRequest } from '@sand/llm-accounts/contract'
import type { Message } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { LoopsContext } from '../context'
import type { ModelChoice, TurnHooks, TurnOutcome } from '../contract'
import { outside } from './fault'
import type { TurnState } from './state'
import { streamReply } from './stream'
import { runTools } from './tools'

const applyChoice = (request: LLMRequest, choice: ModelChoice | undefined): LLMRequest =>
  choice
    ? {
        ...request,
        ...(choice.model && { model: choice.model }),
        ...(choice.effort && { effort: choice.effort }),
        ...(choice.speed && { speed: choice.speed }),
      }
    : request

const unchanged = (request: LLMRequest) => request

export const createHooks = (ctx: LoopsContext, session: Session, signal: AbortSignal, state: TurnState): TurnHooks => {
  const build = outside(async () => {
    const request = await ctx.waterfall('context.build', await ctx.context.build(session), session, signal)
    return applyChoice(request, state.choice)
  })

  const overflow = outside(async (error: unknown) => !signal.aborted && Boolean(await ctx.bail('context.overflow', session, error, signal)))

  const stream = async (shape: (request: LLMRequest) => LLMRequest) => streamReply(ctx, shape(await build()), session, signal, state)

  const hooks: TurnHooks = {
    async send(shape = unchanged) {
      try {
        return await stream(shape)
      } catch (error) {
        if (!(await overflow(error))) throw error
        return stream(shape)
      }
    },
    respond: outside(async (message: Message) => {
      const final = await ctx.waterfall('llm.response', message, session)
      hooks.append(final)
      state.partial.clear()
      state.reply = textOf(final.content)
      return final
    }),
    tools: calls => runTools(ctx, calls, session, signal),
    inbox: outside(() => ctx.waterfall('turn.inbox', [], session)),
    stop: outside(async (outcome: TurnOutcome) => {
      const next = await ctx.bail('turn.stop', session, { ...outcome, usage: state.usage }, signal)
      signal.throwIfAborted()
      if (!next?.length) return undefined
      hooks.append({ role: 'user', content: [...next, ...(await hooks.inbox())] })
      ctx.emit('turn.continue', session, next)
      return next
    }),
    append: message => session.append('message', message),
  }
  return hooks
}
