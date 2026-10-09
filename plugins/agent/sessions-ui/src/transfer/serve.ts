import type { Server } from '@sand/server/contract'
import type { SessionsContext } from '../types'
import { exportThread } from './export'
import { acceptFormat } from './format'
import { importThread } from './import'
import { linkThread } from './link'
import { createStaging } from './stage'

export const serveTransfer = (ctx: SessionsContext, server: Server) => {
  const staging = createStaging()
  const handlers = [
    server.handle('thread.export', exportThread(ctx)),
    server.handle('thread.stage', request => void staging.add(request.transfer, acceptFormat(ctx.sessions, request.entries, request.format))),
    server.handle('thread.import', importThread(ctx, staging)),
    server.handle('thread.link', linkThread(ctx)),
  ]
  return () => {
    handlers.forEach(dispose => void dispose())
    staging.dispose()
  }
}
