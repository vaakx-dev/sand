import type { LLMEvent } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { ServerContext } from '../context'
import type { LiveTracker } from '../live/track'
import type { Socket } from '../socket/sockets'
import { createCoalescer } from './coalesce'
import { createWatchers } from './watch'
import { eventFrame, liveEvent, sessionRef } from './wire'

const coalesceMs = 50

type Publish = (payload: string, to: (socket: Socket) => boolean) => void

export const createStream = (ctx: ServerContext, publish: Publish, tracker: LiveTracker) => {
  const watchers = createWatchers<Socket>()

  const send = (event: LLMEvent, session: Session) =>
    publish(eventFrame({ name: 'llm.event', args: [liveEvent(event), sessionRef(session)] }), socket => watchers.sees(socket, session.id))

  const coalescer = createCoalescer(send, coalesceMs)
  ctx.on('llm.event', coalescer.push)
  ctx.effect(() => coalescer.stop)

  const focus = (socket: Socket, session: string | undefined) => {
    coalescer.flush()
    watchers.focus(socket, session)
    const snapshot = session && tracker.snapshot(session)
    if (snapshot) socket.send(eventFrame({ name: 'live.snapshot', args: [session, snapshot] }))
  }

  return { focus, forget: watchers.forget, flush: coalescer.flush }
}
