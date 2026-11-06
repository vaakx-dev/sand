import type { Message, ToolCallBlock } from '@sand/chats/contract'
import type { LiveSnapshot } from '@sand/server/contract'
import type { Thread } from '../contract'

const tailLines = 4

const runningCall = (thread: Thread, running: Set<string>) => {
  if (thread.step && running.has(thread.step.id)) return thread.step
  let found: ToolCallBlock | undefined
  for (const entry of thread.entries.values()) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_call' && running.has(block.id)) found = block
  }
  return found
}

export const catchUp = (thread: Thread, { live, tools, mark }: LiveSnapshot) => {
  thread.live = live
  thread.mark = mark
  thread.tools = { ...thread.tools, running: new Set(tools) }
  thread.step = runningCall(thread, thread.tools.running)
}

export const clearTurn = (thread: Thread) => {
  thread.started = undefined
  thread.waiting = undefined
  thread.live = []
  thread.mark = undefined
  thread.tools = { running: new Set(), results: new Map(), logs: new Map() }
}

export const addLog = (thread: Thread, id: string, text: string) => {
  const lines = [...(thread.tools.logs.get(id) ?? []), ...text.split('\n')]
  thread.tools.logs.set(id, lines.slice(-tailLines))
}
