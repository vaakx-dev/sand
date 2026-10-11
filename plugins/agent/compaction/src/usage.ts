import type { Server } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { joinDisposers } from '@sand/kit'
import type { ContextUsage } from './contract'
import type { Context } from 'drydock'

export const serveUsage = (ctx: Context, server: Server, read: (session: Session) => Promise<ContextUsage | undefined>) =>
  joinDisposers(
    server.handle('context.get', request => {
      const session = ctx.sessions?.open(String(request.session))
      return session ? read(session) : undefined
    }),
    ctx.on('context.usage', (session, usage) => server.broadcast('context.change', [session.id, usage])),
  )
