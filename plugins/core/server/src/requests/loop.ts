import type { ServerContext } from '../context'
import type { CoreHandlers } from './registry'
import { openSession } from './open'

export const loopRequests = (ctx: ServerContext): CoreHandlers => {
  const session = (id: string) => openSession(ctx, id)
  return {
    'loop.run': request => ctx.loop.run(session(request.session), request.prompt),
    'loop.interrupt': request => ctx.loop.interrupt(session(request.session)),
  }
}
