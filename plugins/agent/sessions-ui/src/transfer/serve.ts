import { joinDisposers } from '@sand/kit'
import type { Entry } from '@sand/messages'
import type { Server } from '@sand/server/contract'
import type { Sessions, ThreadLinkEntries } from '@sand/sessions-sqlite/contract'
import type { SessionsContext } from '../types'
import { exportThread } from './export'
import { importThread } from './import'
import { createStaging } from './stage'

const acceptFormat = (sessions: Sessions, entries: Entry[], format = 1) => {
  if (format > sessions.format) throw new Error(`This thread comes from a newer sand (log format ${format}). Update sand on this PC first.`)
  return format < sessions.format ? sessions.upgrade(entries, format) : entries
}

export const serveTransfer = (ctx: SessionsContext, server: Server) => {
  const staging = createStaging()
  return joinDisposers(
    server.handle({
      'thread.export': exportThread(ctx),
      'thread.stage': request => void staging.add(request.transfer, acceptFormat(ctx.sessions, request.entries, request.format)),
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
