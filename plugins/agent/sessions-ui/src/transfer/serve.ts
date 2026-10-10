import { joinDisposers } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import type { SessionsContext } from '../types'
import { exportThread } from './export'
import { acceptFormat } from './format'
import { importThread } from './import'
import { linkThread } from './link'
import { createStaging } from './stage'

export const serveTransfer = (ctx: SessionsContext, server: Server) => {
  const staging = createStaging()
  return joinDisposers(
    server.handle({
      'thread.export': exportThread(ctx),
      'thread.stage': request => void staging.add(request.transfer, acceptFormat(ctx.sessions, request.entries, request.format)),
      'thread.import': importThread(ctx, staging),
      'thread.link': linkThread(ctx),
    }),
    server.inlineMedia('thread.export'),
    staging.dispose,
  )
}
