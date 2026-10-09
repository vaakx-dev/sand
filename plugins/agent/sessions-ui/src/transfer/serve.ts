import type { Server } from '@sand/protocol'
import type { SessionsContext } from '../types'
import { exportThread } from './export'
import { importThread } from './import'
import { linkThread } from './link'
import { createStaging } from './stage'

export const serveTransfer = (ctx: SessionsContext, server: Server) => {
  const staging = createStaging()
  const handlers = [
    server.handle('thread.export', exportThread(ctx)),
    server.handle('thread.stage', request => void staging.add(request.transfer, request.entries)),
    server.handle('thread.import', importThread(ctx, staging)),
    server.handle('thread.link', linkThread(ctx)),
  ]
  return () => {
    handlers.forEach(dispose => void dispose())
    staging.dispose()
  }
}
