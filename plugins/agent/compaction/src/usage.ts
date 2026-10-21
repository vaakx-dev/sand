import { sessions, type Session } from '@sand/chats/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { contextChange, contextGet, contextUsage, type ContextUsage } from './contract'

export const serveUsage = (ctx: Context, server: Server, read: (session: Session) => Promise<ContextUsage | undefined>) =>
  joinDisposers(
    server.handle(contextGet, request => {
      const session = ctx.get(sessions)?.open(request.session)
      return session ? read(session) : undefined
    }),
    ctx.on(contextUsage, (session, usage) => server.broadcast(contextChange, [session.id, usage])),
  )
