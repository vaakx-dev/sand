import type { WireHandlers } from '@sand/protocol'
import type { ServerContext } from '../context'

export const loopRequests = (ctx: ServerContext): WireHandlers => {
  const session = (id: string) => ctx.sessions.require(id)
  return {
    'loop.run': request => ctx.loop.run(session(request.session), request.prompt),
    'loop.interrupt': request => ctx.loop.interrupt(session(request.session)),
  }
}
