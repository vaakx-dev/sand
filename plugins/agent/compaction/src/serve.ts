import { engine, type Conversation, type ConversationRef } from '@sand/engine/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { type Compacted, contextChange, contextCompact, contextGet, contextUsage, type ContextUsage } from './contract'

interface Actions {
  read(conversation: Conversation): Promise<ContextUsage | undefined>
  compact(conversation: ConversationRef): Promise<Compacted>
}

export const serveContext = (ctx: Context, server: Server, { read, compact }: Actions) =>
  joinDisposers(
    server.handle(contextGet, ({ session, owner }) => {
      const conversation = ctx.get(engine)?.open({ owner, id: session })
      return conversation ? read(conversation) : undefined
    }),
    server.handle(contextCompact, ({ session, owner }) => compact({ owner, id: session })),
    ctx.on(contextUsage, (conversation, usage) => server.broadcast(contextChange, [conversation.id, usage])),
  )
