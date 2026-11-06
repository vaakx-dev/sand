import { llmEvent, type LLMEvent } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { liveSnapshot, llmEventWire } from '../contract'
import type { ServerContext } from '../context'
import { type Audience, deliver, eventFrame, type Socket } from '../socket/sockets'
import { createCoalescer } from './coalesce'
import type { LiveTracker } from './live'
import { createWatchers } from './watch'
import { liveEvent, sessionRef } from './wire'

const overdueMs = 1500

type Publish = (frame: () => string, to: Audience) => void

export const createStream = (ctx: ServerContext, publish: Publish, tracker: LiveTracker) => {
  const watchers = createWatchers<Socket>()

  const send = (event: LLMEvent, session: Session) => {
    const mark = tracker.sent(session.id)
    const payload = [liveEvent(event), sessionRef(session), ...(mark ? [mark] : [])]
    publish(() => eventFrame(llmEventWire.id, payload), socket => watchers.sees(socket, session.id))
  }

  const coalescer = createCoalescer(send, overdueMs)
  ctx.on(llmEvent, coalescer.push)
  ctx.effect(() => coalescer.stop)

  const snapshot = (session: string) => {
    coalescer.flush()
    return tracker.snapshot(session)
  }

  const catchUp = (socket: Socket, session: string) => {
    const found = tracker.snapshot(session)
    if (found) deliver(socket, eventFrame(liveSnapshot.id, [session, found]))
  }

  const focus = (socket: Socket, session: string | undefined) => {
    coalescer.flush()
    watchers.focus(socket, session)
    if (session) catchUp(socket, session)
  }

  const watch = (socket: Socket, sessions: string[]) => {
    coalescer.flush()
    watchers.watch(socket, sessions)
    for (const session of sessions) catchUp(socket, session)
  }

  return { focus, watch, snapshot, forget: watchers.forget, focused: watchers.focused, sees: watchers.sees, flush: coalescer.flush }
}
