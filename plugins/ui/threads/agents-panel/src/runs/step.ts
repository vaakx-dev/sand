import type { ToolCallBlock } from '@sand/chats/contract'
import type { Thread } from '@sand/web-client/contract'
import { inputText, toolCalls } from './calls'

const phrases: Record<string, [verb: string, key: string]> = {
  shell: ['Running', 'command'],
  read: ['Reading', 'path'],
  edit: ['Editing', 'path'],
  patch: ['Editing', 'path'],
  write: ['Writing', 'path'],
  grep: ['Searching for', 'pattern'],
  search: ['Searching for', 'query'],
  glob: ['Finding', 'pattern'],
  find: ['Finding', 'pattern'],
}

const firstLine = (text: string) => text.trim().split('\n')[0]?.trim() ?? ''

const describeStep = (call: ToolCallBlock) => {
  const name = call.name.toLowerCase()
  if (name === 'agent') {
    const label = firstLine(inputText(call.input, 'label'))
    return label ? `Starting an agent: ${label}` : 'Starting an agent'
  }
  const phrase = phrases[name]
  if (!phrase) return call.name
  const subject = firstLine(inputText(call.input, phrase[1]))
  return subject ? `${phrase[0]} ${subject}` : call.name
}

export const currentStep = (thread: Thread) => {
  if (!thread.running) return undefined
  const call = thread.step ?? [...toolCalls(thread.entries.values()).values()].at(-1)
  return call && describeStep(call)
}
