import type { Thread, ToolCallBlock } from '@sand/protocol'

export type Calls = Map<string, ToolCallBlock>

const text = (input: unknown, key: string) => {
  const value = (input as Record<string, unknown> | undefined)?.[key]
  return typeof value === 'string' ? value : ''
}

export const startedBy = (thread: Thread, calls: Calls) => {
  const call = thread.info.origin ? calls.get(thread.info.origin) : undefined
  if (!call) return {}
  if (call.name === 'workflow') return { name: text(call.input, 'label') || 'workflow' }
  if (call.name !== 'agent') return { name: call.name }
  return { name: text(call.input, 'agent') || 'general', label: text(call.input, 'label') || undefined }
}
