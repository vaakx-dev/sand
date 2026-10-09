import type { LLMRequest } from '@sand/llm-accounts/contract'
import type { Message } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { LoopsContext } from '../context'
import type { ModelChoice, RunOverrides, TurnHooks, TurnOutcome } from '../contract'
import { outside } from './fault'
import type { TurnState } from './state'
import { streamReply } from './stream'
import { runTools } from './tools'

export const textOf = (message: Message) =>
  message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

const applyChoice = (request: LLMRequest, choice: ModelChoice | undefined): LLMRequest =>
  choice
    ? {
        ...request,
        ...(choice.model && { model: choice.model }),
        ...(choice.effort && { effort: choice.effort }),
        ...(choice.speed && { speed: choice.speed }),
      }
    : request

export const createHooks = (
  ctx: LoopsContext,
  session: Session,
  signal: AbortSignal,
  overrides: RunOverrides,
  state: TurnState,
): TurnHooks => {
  const llm = overrides.llm ?? ctx.llm
  const tools = overrides.tools ?? ctx.tools

  const hooks: TurnHooks = {
    build: outside(async () => {
      const built = await ctx.context.build(session)
      const base = overrides.tools ? { ...built, tools: overrides.tools.specs() } : built
      return applyChoice(await ctx.waterfall('context.build', base, session, signal), state.choice)
    }),
    stream: request => streamReply(ctx, llm, request, session, signal, state),
    async send() {
      try {
        return await hooks.stream(await hooks.build())
      } catch (error) {
        if (!(await hooks.overflow(error))) throw error
        return hooks.stream(await hooks.build())
      }
    },
    respond: outside(async (message: Message) => {
      const final = await ctx.waterfall('llm.response', message, session)
      hooks.append(final)
      state.partial.clear()
      state.reply = textOf(final)
      return final
    }),
    tools: calls => runTools(ctx, tools, calls, session, signal),
    inbox: outside(() => ctx.waterfall('turn.inbox', [], session)),
    stop: outside(async (outcome: TurnOutcome) => {
      const next = await ctx.bail('turn.stop', session, { ...outcome, usage: state.usage }, signal)
      signal.throwIfAborted()
      if (!next?.length) return undefined
      hooks.append({ role: 'user', content: [...next, ...(await hooks.inbox())] })
      ctx.emit('turn.continue', session, next)
      return next
    }),
    overflow: outside(async (error: unknown) => {
      if (signal.aborted) return false
      return Boolean(await ctx.bail('context.overflow', session, error, signal))
    }),
    append: message => session.append('message', message),
  }
  return hooks
}
