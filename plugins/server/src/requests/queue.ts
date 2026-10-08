import type { QueueState, Session } from '@sand/protocol'
import type { ServerContext } from '../context'

export const queueState = (ctx: ServerContext, session: Session): QueueState => ({
  steers: ctx.loop.steers(session),
  followUps: ctx.followUps?.list(session) ?? [],
})
