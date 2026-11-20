import type { Message, ToolCallBlock } from '@sand/chats/contract'
import { isRecord } from '@sand/util'
import type { CompactedFiles } from '../contract'

const readers = new Set(['read'])
const writers = new Set(['write', 'edit'])

const pathOf = (input: unknown) => (isRecord(input) && typeof input.path === 'string' ? [input.path] : [])

const pathsOf = (input: unknown) => (isRecord(input) && Array.isArray(input.edits) ? input.edits.flatMap(pathOf) : pathOf(input))

const callsIn = (messages: Message[]) => messages.flatMap(message => message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call'))

export const filesOf = (messages: Message[], nested: ToolCallBlock[], previous?: CompactedFiles): CompactedFiles => {
  const read = new Set(previous?.read)
  const modified = new Set(previous?.modified)
  for (const block of [...callsIn(messages), ...nested]) {
    const paths = pathsOf(block.input)
    if (readers.has(block.name)) paths.forEach(path => read.add(path))
    if (writers.has(block.name)) paths.forEach(path => modified.add(path))
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
