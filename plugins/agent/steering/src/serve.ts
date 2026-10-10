import type { Session } from '@sand/sessions-sqlite/contract'
import { joinDisposers } from '@sand/kit'
import type { Context } from 'drydock'
import type { QueueState, Steering } from './contract'

export const queueState = (ctx: Context, steering: Steering, session: Session): QueueState => ({
  steers: steering.list(session),
  followUps: ctx.followUps?.list(session) ?? [],
})

export const serveSteering = (ctx: Context<'sessions'>, steering: Steering) => {
  const { sessions } = ctx
  ctx.watch('server', server => {
    if (!server) return
    return joinDisposers(
      ctx.on('turn.queue', thread => server.broadcast('queue.change', [thread.id, queueState(ctx, steering, thread)])),
      server.handle({
        'loop.steer': request => steering.steer(sessions.require(request.session), request.prompt, request.label) ?? null,
        'loop.unsteer': request => steering.unsteer(sessions.require(request.session), request.item),
        'queue.get': request => queueState(ctx, steering, sessions.require(request.session)),
      }),
    )
  })
}
