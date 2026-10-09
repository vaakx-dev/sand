import type { LLMEvent } from '@sand/llm-accounts/contract'
import type { Thread } from '../contract'
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
