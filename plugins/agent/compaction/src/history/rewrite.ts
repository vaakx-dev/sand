import type { Block, CompactionRecord, Entry, LLMRequest, Message } from '@sand/protocol'
import { filesText } from '../summarize/files'
import { messageOf, view } from './view'

const summaryText = ({ summary, files }: CompactionRecord) =>
  [`The earlier part of this conversation was compacted. Summary:\n\n${summary}`, files && filesText(files)].filter(Boolean).join('\n\n')

const summaryMessage = (record: CompactionRecord, pinned?: Message): Message => ({
  role: 'user',
  content: [
    { type: 'text', text: summaryText(record) },
    ...(pinned ? [{ type: 'text', text: 'The request the current work answers, verbatim:' } as Block, ...pinned.content] : []),
  ],
})

export const pinnedMessage = (path: Entry[], id?: string) => {
  const entry = id ? path.find(candidate => candidate.id === id) : undefined
  return entry && messageOf(entry)
}

export const rewrite = (path: Entry[], request: LLMRequest): LLMRequest => {
  const { record, entries } = view(path)
  if (!record) return request
  const pinned = entries.some(entry => entry.id === record.pinned) ? undefined : pinnedMessage(path, record.pinned)
  return { ...request, messages: [summaryMessage(record, pinned), ...entries.map(messageOf)] }
}
