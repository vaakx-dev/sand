import type { ToolCallBlock } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import { inputText } from './input'

export type Calls = Map<string, ToolCallBlock>

export const startedBy = (thread: Thread, calls: Calls) => {
  const call = thread.info.origin ? calls.get(thread.info.origin) : undefined
  if (!call) return {}
  if (call.name === 'workflow') return { name: inputText(call.input, 'label') || 'workflow' }
  if (call.name !== 'agent') return { name: call.name }
  return { name: inputText(call.input, 'agent') || 'general', label: inputText(call.input, 'label') || undefined }
}
