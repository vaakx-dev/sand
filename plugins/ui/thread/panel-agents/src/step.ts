import { toolCalls } from '@sand/kit'
import type { ToolCallBlock } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import { inputText } from './input'

const phrases: Record<string, [verb: string, key: string]> = {
  shell: ['Running', 'command'],
  bash: ['Running', 'command'],
  read: ['Reading', 'path'],
  edit: ['Editing', 'path'],
  write: ['Writing', 'path'],
  grep: ['Searching for', 'pattern'],
  glob: ['Finding', 'pattern'],
}

const firstLine = (text: string) => text.trim().split('\n')[0]?.trim() ?? ''

export const describeStep = (call: ToolCallBlock) => {
  const name = call.name.toLowerCase()
  if (name === 'agent') {
    const label = firstLine(inputText(call.input, 'label'))
    return label ? `Starting an agent: ${label}` : 'Starting an agent'
  }
  if (name === 'workflow') return 'Running a workflow'
  const phrase = phrases[name]
  const subject = phrase ? firstLine(inputText(call.input, phrase[1])) : ''
  return phrase && subject ? `${phrase[0]} ${subject}` : call.name
}

export const currentStep = (thread: Thread | undefined) => {
  if (!thread?.running) return undefined
  const call = thread.step ?? [...toolCalls(thread.entries.values()).values()].at(-1)
  return call && describeStep(call)
}
