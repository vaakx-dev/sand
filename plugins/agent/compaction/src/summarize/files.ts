import type { Message } from '@sand/chats/contract'
import { z } from 'zod'
import type { CompactedFiles } from '../contract'

const readers = new Set(['read'])
const writers = new Set(['write', 'edit'])

const pathInput = z.object({ path: z.string() })
const editsInput = z.object({ edits: z.array(z.unknown()) })

const pathOf = (input: unknown) => {
  const parsed = pathInput.safeParse(input)
  return parsed.success ? [parsed.data.path] : []
}

const pathsOf = (input: unknown) => {
  const parsed = editsInput.safeParse(input)
  return parsed.success ? parsed.data.edits.flatMap(pathOf) : pathOf(input)
}

export const filesOf = (messages: Message[], previous?: CompactedFiles): CompactedFiles => {
  const read = new Set(previous?.read)
  const modified = new Set(previous?.modified)
  for (const block of messages.flatMap(message => message.content)) {
    if (block.type !== 'tool_call') continue
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
