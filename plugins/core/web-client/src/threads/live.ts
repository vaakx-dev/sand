import type { LiveSnapshot } from '@sand/server/contract'
import type { Thread } from '../contract'

export const catchUp = (thread: Thread, { live, tools }: LiveSnapshot) => {
  thread.live = live
  thread.tools = { running: new Set(tools), results: thread.tools.results }
}

export const clearTurn = (thread: Thread) => {
  thread.started = undefined
  thread.live = []
  thread.tools = { running: new Set(), results: new Map() }
  thread.queued = []
}
