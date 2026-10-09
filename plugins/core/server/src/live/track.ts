import type { LiveBlock } from '@sand/llm-accounts/contract'
import { applyLiveEvent } from '@sand/kit'
import type { ServerContext } from '../context'

interface Streaming {
  live: LiveBlock[]
  tools: Set<string>
}

export interface LiveSnapshot {
  live: LiveBlock[]
  tools: string[]
}

export type LiveTracker = ReturnType<typeof createLiveTracker>

export const createLiveTracker = (ctx: ServerContext) => {
  const running = new Map<string, Streaming>()

  ctx.on('turn.start', session => void running.set(session.id, { live: [], tools: new Set() }))
  ctx.on('llm.event', (event, session) => {
    const streaming = running.get(session.id)
    if (streaming) streaming.live = applyLiveEvent(streaming.live, event)
  })
  ctx.on('session.entry', (session, written) => {
    const streaming = running.get(session.id)
    if (streaming && written.type === 'message') streaming.live = []
  })
  ctx.on('tool.start', (call, session) => void running.get(session.id)?.tools.add(call.id))
  ctx.on('tool.result', (_result, call, session) => {
    running.get(session.id)?.tools.delete(call.id)
    return undefined
  })
  ctx.on('turn.end', session => void running.delete(session.id))

  const snapshot = (id: string): LiveSnapshot | undefined => {
    const streaming = running.get(id)
    return streaming && { live: streaming.live, tools: [...streaming.tools] }
  }

  return { snapshot }
}
