import { llmLimits, llmLimitsWire } from '@sand/accounts/contract'
import { sessionEntry, sessionEntryWire, sessionRemove, sessionRemoveWire, sessionUpdate, sessionUpdateWire } from '@sand/chats/contract'
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
import type { ServerContext } from '../context'
import { sessionRef } from '../stream/wire'

export type Send = (event: WireEvent<unknown>, payload: unknown) => void

export const forwardEvents = (ctx: ServerContext, send: Send) => {
  ctx.on(turnStart, (...args) => send(turnStartWire, args))
  ctx.on(turnEnd, (...args) => send(turnEndWire, args))
  ctx.on(turnSteer, (...args) => send(turnSteerWire, args))
  ctx.on(llmLimits, limits => send(llmLimitsWire, limits))
  ctx.on(sessionEntry, (...args) => send(sessionEntryWire, args))
  ctx.on(sessionUpdate, session => send(sessionUpdateWire, session))
  ctx.on(sessionRemove, id => send(sessionRemoveWire, id))
  ctx.on(artifactSaved, (...args) => send(artifactSavedWire, args))
  ctx.on(toolStart, (call, session) => send(toolStartWire, [call, sessionRef(session)]))
  ctx.on(toolProgress, (call, text, session) => send(toolProgressWire, [call, text, sessionRef(session)]))
  ctx.on(toolResult, (result, call, session) => {
    send(toolResultWire, [result, call, sessionRef(session)])
    return undefined
  })
}
