import { engine, type Conversation } from '@sand/engine/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { contextChange, contextGet, contextUsage, type ContextUsage } from './contract'

export const serveUsage = (ctx: Context, server: Server, read: (conversation: Conversation) => Promise<ContextUsage | undefined>) =>
  joinDisposers(
    server.handle(contextGet, ({ session, owner }) => {
      const conversation = ctx.get(engine)?.open({ owner, id: session })
      return conversation ? read(conversation) : undefined
    }),
    ctx.on(contextUsage, (conversation, usage) => server.broadcast(contextChange, [conversation.id, usage])),
  )
