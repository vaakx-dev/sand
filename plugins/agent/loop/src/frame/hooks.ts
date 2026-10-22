import type { Session } from '@sand/chats/contract'
import { textOf } from '@sand/chats/prompt'
import type { LoopsContext } from '../context'
import { contextBuild, contextOverflow, turnInbox } from '../contract'
import type { TurnHooks } from '../turn'
import type { TurnState } from './state'
import { streamReply } from './stream'
import { runTools } from './tools'

export const createHooks = (ctx: LoopsContext, session: Session, signal: AbortSignal, state: TurnState): TurnHooks => {
  const build = async () => {
    const request = await ctx.waterfall(contextBuild, await ctx.context.build(session), session, signal)
    return { ...request, session: session.id, sessionKind: session.kind }
  }

  const overflow = async (error: unknown) => !signal.aborted && Boolean(await ctx.bail(contextOverflow, session, error, signal))

  const stream = async () => streamReply(ctx, await build(), session, signal, state)

  const hooks: TurnHooks = {
    async send() {
      try {
        return await stream()
      } catch (error) {
        if (!(await overflow(error))) throw error
        return stream()
      }
    },
    respond(message) {
      hooks.append(message)
      state.partial.clear()
      state.reply = textOf(message.content)
    },
    tools: calls => runTools(ctx, calls, session, signal),
    inbox: () => ctx.waterfall(turnInbox, [], session),
    append: message => session.append('message', message),
  }
  return hooks
}
