import { type LiveBlock, llmEvent } from '@sand/accounts/contract'
import { sessionEntry } from '@sand/chats/contract'
import { toolResult, toolStart, turnEnd, turnStart } from '@sand/turns-contract/contract'
import { applyLiveEvent, type LiveSnapshot, type Mark } from '../contract'
import type { ServerContext } from '../context'

interface Streaming {
  live: LiveBlock[]
  tools: Set<string>
  mark: Mark
}

export const createLiveTracker = (ctx: ServerContext) => {
  const running = new Map<string, Streaming>()

  ctx.on(turnStart, (session, _prompt, info) => void running.set(session.id, { live: [], tools: new Set(), mark: { turn: info.id, n: 0 } }))
  ctx.on(llmEvent, (event, session) => {
    const streaming = running.get(session.id)
    if (streaming) streaming.live = applyLiveEvent(streaming.live, event)
  })
  ctx.on(sessionEntry, (session, written) => {
    const streaming = running.get(session.id)
    if (streaming && written.type === 'message') streaming.live = []
  })
  ctx.on(toolStart, (call, session) => void running.get(session.id)?.tools.add(call.id))
  ctx.on(toolResult, (_result, call, session) => {
    running.get(session.id)?.tools.delete(call.id)
    return undefined
  })
  ctx.on(turnEnd, session => void running.delete(session.id))

  const sent = (id: string): Mark | undefined => {
    const streaming = running.get(id)
    if (!streaming) return undefined
    streaming.mark = { turn: streaming.mark.turn, n: streaming.mark.n + 1 }
    return streaming.mark
  }

  const snapshot = (id: string): LiveSnapshot | undefined => {
    const streaming = running.get(id)
    return streaming && { live: streaming.live, tools: [...streaming.tools], mark: streaming.mark }
  }

  return { sent, snapshot }
}

export type LiveTracker = ReturnType<typeof createLiveTracker>
