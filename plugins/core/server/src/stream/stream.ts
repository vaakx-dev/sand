import { llmEvent, type LLMEvent } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { liveSnapshot, llmEventWire } from '../contract'
import type { ServerContext } from '../context'
import { deliver, eventFrame, type Socket } from '../socket/sockets'
import { createCoalescer } from './coalesce'
import type { LiveTracker } from './live'
import { createWatchers } from './watch'
import { liveEvent, sessionRef } from './wire'

const overdueMs = 1500

type Publish = (frame: string, to: (socket: Socket) => boolean) => void

export const createStream = (ctx: ServerContext, publish: Publish, tracker: LiveTracker) => {
  const watchers = createWatchers<Socket>()

  const send = (event: LLMEvent, session: Session) =>
    publish(eventFrame(llmEventWire.id, [liveEvent(event), sessionRef(session)]), socket => watchers.sees(socket, session.id))

  const coalescer = createCoalescer(send, overdueMs)
  ctx.on(llmEvent, coalescer.push)
  ctx.effect(() => coalescer.stop)

  const focus = (socket: Socket, session: string | undefined) => {
    coalescer.flush()
    watchers.focus(socket, session)
    const snapshot = session && tracker.snapshot(session)
    if (snapshot) deliver(socket, eventFrame(liveSnapshot.id, [session, snapshot]))
  }

  return { focus, forget: watchers.forget, focused: watchers.focused, flush: coalescer.flush }
}
