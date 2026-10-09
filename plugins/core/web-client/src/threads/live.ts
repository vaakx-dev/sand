import type { LLMEvent, Thread } from '@sand/protocol'
import { applyLiveEvent } from '@sand/kit'

export const applyLive = (thread: Thread, event: LLMEvent) => {
  thread.live = applyLiveEvent(thread.live, event)
}

export const clearTurn = (thread: Thread) => {
  thread.started = undefined
  thread.live = []
  thread.tools = { running: new Set(), results: new Map() }
  thread.queued = []
}
