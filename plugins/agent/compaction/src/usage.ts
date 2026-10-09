import type { ContextUsage, Server, Session } from '@sand/protocol'
import type { Context } from 'drydock'

export const serveUsage = (ctx: Context, server: Server, read: (session: Session) => Promise<ContextUsage | undefined>) => {
  const disposers = [
    server.handle('context.get', request => {
      const session = ctx.sessions?.open(String(request.session))
      return session ? read(session) : undefined
    }),
    ctx.on('context.usage', (session, usage) => server.broadcast('context.change', [session.id, usage])),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
