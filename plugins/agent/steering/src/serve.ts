import type { Session, sessions } from '@sand/chats/contract'
import { server, userWrote } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { loopSteer, loopUnsteer, queueChange, turnQueue, type QueueState, type Steering } from './contract'

export const queueState = (steering: Steering, session: Session): QueueState => ({ steers: steering.list(session) })

export const serveSteering = (ctx: Context<{ sessions: typeof sessions }>, steering: Steering) => {
  const session = (id: string) => ctx.sessions.require(id)
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      ctx.on(turnQueue, thread => found.broadcast(queueChange, [thread.id, queueState(steering, thread)])),
      found.handle(loopSteer, request => {
        const thread = session(request.session)
        const id = steering.steer(thread, request.prompt, request.label)
        if (id) ctx.emit(userWrote, thread)
        return id ?? null
      }),
      found.handle(loopUnsteer, request => steering.unsteer(session(request.session), request.item)),
    )
  })
}
