import type { Brief } from '@sand/provider-threads/contract'
import { stepTools } from '@sand/turns-contract/contract'
import type { TurnsContext } from './context'

export const threadBrief = (ctx: TurnsContext): Brief => {
  const session = (id: string) => ctx.sessions.require(id)
  return {
    system: (conversation, model) => ctx.context.thread(session(conversation.id), model),
    tools(conversation, messages) {
      const found = session(conversation.id)
      return ctx.waterfall(stepTools, ctx.context.tools(found, messages), found)
    },
    kind: conversation => session(conversation.id).kind,
  }
}
