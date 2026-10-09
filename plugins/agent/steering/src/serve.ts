import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { QueueState, Steering } from './contract'

export const queueState = (ctx: Context, steering: Steering, session: Session): QueueState => ({
  steers: steering.list(session),
  followUps: ctx.followUps?.list(session) ?? [],
})

export const serveSteering = (ctx: Context<'sessions'>, steering: Steering) => {
  const session = (id: string) => {
    const found = ctx.sessions.open(id)
    if (!found) throw new Error(`No thread ${id}`)
    return found
  }
  ctx.watch('server', server => {
    if (!server) return
    const changed = ctx.on('turn.queue', thread => server.broadcast('queue.change', [thread.id, queueState(ctx, steering, thread)]))
    const disposers = [
      changed,
      server.handle('loop.steer', request => steering.steer(session(request.session), request.prompt, request.label) ?? null),
      server.handle('loop.unsteer', request => steering.unsteer(session(request.session), request.item)),
      server.handle('queue.get', request => queueState(ctx, steering, session(request.session))),
    ]
    return () => disposers.forEach(dispose => void dispose())
  })
}
