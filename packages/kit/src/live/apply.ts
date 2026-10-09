import type { LLMEvent, LiveBlock } from '@sand/protocol'

const place = (live: LiveBlock[], block: LiveBlock) => {
  const index = live.findIndex(other => other.index === block.index)
  if (index < 0) return [...live, block].sort((a, b) => a.index - b.index)
  const next = [...live]
  next[index] = block
  return next
}

const update = (live: LiveBlock[], index: number, change: (block: LiveBlock) => LiveBlock | undefined) => {
  const at = live.findIndex(other => other.index === index)
  const block = live[at]
  const changed = block && change(block)
  if (!changed) return live
  const next = [...live]
  next[at] = changed
  return next
}

export const applyLiveEvent = (live: LiveBlock[], event: LLMEvent): LiveBlock[] => {
  if (event.type === 'start') return []
  if (event.type === 'tool_call') return place(live, { type: 'tool', index: event.index, id: event.id, name: event.name, input: '' })
  if (event.type === 'tool_input')
    return update(live, event.index, block => (block.type === 'tool' ? { ...block, input: block.input + event.json } : undefined))
  if (event.type === 'block') return update(live, event.index, block => (block.type !== 'tool' ? { ...block, done: true } : undefined))
  if (event.type !== 'text' && event.type !== 'thinking') return live
  const block = live.find(other => other.index === event.index)
  if (block && block.type === event.type) return update(live, event.index, () => ({ ...block, text: block.text + event.text }))
  return place(live, { type: event.type, index: event.index, text: event.text })
}
