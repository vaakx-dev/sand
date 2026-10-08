import type { LLMEvent, LiveBlock, Thread } from '@sand/protocol'

const place = (thread: Thread, block: LiveBlock) => {
  const index = thread.live.findIndex(other => other.index === block.index)
  if (index >= 0) thread.live[index] = block
  else thread.live = [...thread.live, block].sort((a, b) => a.index - b.index)
}

export const applyLive = (thread: Thread, event: LLMEvent) => {
  if (event.type === 'start') thread.live = []
  if (event.type === 'tool_call') place(thread, { type: 'tool', index: event.index, id: event.id, name: event.name, input: '' })
  if (event.type === 'tool_input') {
    const block = thread.live.find(other => other.index === event.index)
    if (block?.type === 'tool') block.input += event.json
  }
  if (event.type === 'block') {
    const block = thread.live.find(other => other.index === event.index)
    if (block && block.type !== 'tool') block.done = true
  }
  if (event.type !== 'text' && event.type !== 'thinking') return
  const block = thread.live.find(other => other.index === event.index)
  if (block && block.type === event.type) block.text += event.text
  else place(thread, { type: event.type, index: event.index, text: event.text })
}
