import type { RequestHandler, Server } from '@sand/protocol'
import type { SyncHandlers } from './service'

export const serveSync = (server: Server, handlers: SyncHandlers) => {
  const disposers = Object.entries(handlers).map(([type, handler]) => server.handle(type, handler as RequestHandler))
  return () => disposers.forEach(dispose => void dispose())
}
