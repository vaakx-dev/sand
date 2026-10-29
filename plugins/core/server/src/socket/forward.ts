import { llmLimits, llmLimitsWire } from '@sand/accounts/contract'
import {
  type Entry,
  type Session,
  sessionEntry,
  sessionEntryWire,
  sessionRemove,
  sessionRemoveWire,
  sessionUpdate,
  sessionUpdateWire,
} from '@sand/chats/contract'
import type { WireEvent } from '@sand/host-hub/contract'
import { artifactSaved, artifactSavedWire } from '@sand/html/contract'
import {
  toolProgress,
  toolProgressWire,
  toolResult,
  toolResultWire,
  toolStart,
  toolStartWire,
  turnEnd,
  turnEndWire,
  turnStart,
  turnStartWire,
} from '@sand/loop/contract'
import { turnSteer, turnSteerWire } from '@sand/steering/contract'
import { sessionHeadWire } from '../contract'
import type { ServerContext } from '../context'
import { sessionRef } from '../stream/wire'
import type { Audience, Socket } from './sockets'

export type Send = (event: WireEvent<unknown>, payload: unknown, to?: Audience) => void

export type Sees = (socket: Socket, session: string) => boolean

const headOf = ({ data, ...head }: Entry) => head

export const forwardEvents = (ctx: ServerContext, send: Send, sees: Sees) => {
  const watching = (session: Session): Audience => socket => sees(socket, session.id)
  const elsewhere = (session: Session): Audience => socket => !sees(socket, session.id)
  const watchingFamily = (session: Session): Audience => socket => sees(socket, session.id) || (!!session.parent && sees(socket, session.parent))

  const split = (session: Session, event: WireEvent<unknown>, full: unknown, slim: unknown) => {
    send(event, full, watching(session))
    send(event, slim, elsewhere(session))
  }

  ctx.on(turnStart, (session, prompt) => split(session, turnStartWire, [session, prompt], [session, { ...prompt, content: [] }]))
  ctx.on(turnEnd, (session, result) => split(session, turnEndWire, [session, result], [session, { ...result, text: '' }]))
  ctx.on(turnSteer, (...args) => send(turnSteerWire, args))
  ctx.on(llmLimits, limits => send(llmLimitsWire, limits))
  ctx.on(sessionEntry, (session, entry) => {
    send(sessionEntryWire, [session, entry], watching(session))
    send(sessionHeadWire, [session, headOf(entry)], elsewhere(session))
  })
  ctx.on(sessionUpdate, session => send(sessionUpdateWire, session))
  ctx.on(sessionRemove, id => send(sessionRemoveWire, id))
  ctx.on(artifactSaved, (...args) => send(artifactSavedWire, args))
  ctx.on(toolStart, (call, session) => send(toolStartWire, [call, sessionRef(session)], watchingFamily(session)))
  ctx.on(toolProgress, (call, text, session) => send(toolProgressWire, [call, text, sessionRef(session)], watching(session)))
  ctx.on(toolResult, (result, call, session) => {
    send(toolResultWire, [result, call, sessionRef(session)], watchingFamily(session))
    return undefined
  })
}
