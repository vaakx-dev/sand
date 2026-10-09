import type { ServerContext } from '../context'
import { queueState } from './queue'
import type { CoreHandlers } from './registry'
import { openSession } from './open'

export const loopRequests = (ctx: ServerContext): CoreHandlers => {
  const session = (id: string) => openSession(ctx, id)
  return {
    'loop.run': request => ctx.loop.run(session(request.session), request.prompt),
    'loop.steer': request => ctx.loop.steer(session(request.session), request.prompt, request.label) ?? null,
    'loop.unsteer': request => ctx.loop.unsteer(session(request.session), request.item),
    'loop.interrupt': request => ctx.loop.interrupt(session(request.session)),
    'queue.get': request => queueState(ctx, session(request.session)),
  }
}
