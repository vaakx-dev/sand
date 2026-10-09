import type { Message } from '@sand/messages'
import type { CompactedFiles } from '../contract'

const readers = new Set(['read'])
const writers = new Set(['write', 'edit'])

const pathOf = (input: unknown) => {
  const path = (input as { path?: unknown } | null)?.path
  return typeof path === 'string' ? path : undefined
}

export const filesOf = (messages: Message[], previous?: CompactedFiles): CompactedFiles => {
  const read = new Set(previous?.read)
  const modified = new Set(previous?.modified)
  for (const block of messages.flatMap(message => message.content)) {
    const path = block.type === 'tool_call' ? pathOf(block.input) : undefined
    if (!path || block.type !== 'tool_call') continue
    if (readers.has(block.name)) read.add(path)
    if (writers.has(block.name)) modified.add(path)
  }
  return { read: [...read].filter(path => !modified.has(path)).sort(), modified: [...modified].sort() }
}

export const filesText = ({ read, modified }: CompactedFiles) =>
  [
    read.length && `<read-files>\n${read.join('\n')}\n</read-files>`,
    modified.length && `<modified-files>\n${modified.join('\n')}\n</modified-files>`,
  ]
    .filter(Boolean)
    .join('\n\n')
