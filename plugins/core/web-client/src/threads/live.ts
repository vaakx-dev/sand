import type { LiveSnapshot } from '@sand/server/contract'
import type { Thread } from '../contract'

const tailLines = 4

export const catchUp = (thread: Thread, { live, tools }: LiveSnapshot) => {
  thread.live = live
  thread.tools = { ...thread.tools, running: new Set(tools) }
}

export const clearTurn = (thread: Thread) => {
  thread.started = undefined
  thread.live = []
  thread.tools = { running: new Set(), results: new Map(), logs: new Map() }
  thread.queued = []
}

export const addLog = (thread: Thread, id: string, text: string) => {
  const lines = [...(thread.tools.logs.get(id) ?? []), ...text.split('\n')]
  thread.tools.logs.set(id, lines.slice(-tailLines))
}
