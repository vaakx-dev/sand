import type { ThreadLinkEntries, WireRequestOf } from '@sand/protocol'
import type { SessionsContext } from '../types'

export const linkThread = (ctx: SessionsContext) => (request: WireRequestOf<'thread.link'>) => {
  const session = ctx.sessions.open(request.session)
  if (!session) throw new Error('No such thread')
  session.append('continued-to', request.to satisfies ThreadLinkEntries['continued-to'])
}
