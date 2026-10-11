import { joinDisposers } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import type { ThreadLinkEntries } from '@sand/sessions-sqlite/contract'
import type { SessionsContext } from '../types'
import { exportThread } from './export'
import { importThread } from './import'
import { createStaging } from './stage'

export const serveTransfer = (ctx: SessionsContext, server: Server) => {
  const staging = createStaging()
  return joinDisposers(
    server.handle({
      'thread.export': exportThread(ctx),
      'thread.stage': request => void staging.add(request.transfer, request.entries),
      'thread.import': importThread(ctx, staging),
      'thread.link': request => {
        const session = ctx.sessions.open(request.session)
        if (!session) throw new Error('No such thread')
        session.append('continued-to', request.to satisfies ThreadLinkEntries['continued-to'])
      },
    }),
    server.inlineMedia('thread.export'),
    staging.dispose,
  )
}
