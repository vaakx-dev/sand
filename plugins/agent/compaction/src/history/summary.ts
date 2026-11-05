import type { Block, Entry, EntryView, Message } from '@sand/chats/contract'
import type { CompactionRecord } from '../contract'
import { filesText } from '../summarize/files'
import { messageOf, view } from './view'

const summaryText = ({ summary, files }: CompactionRecord) =>
  [`The earlier part of this conversation was compacted. Summary:\n\n${summary}`, files && filesText(files)].filter(Boolean).join('\n\n')

const pinnedBlocks = (pinned: Message): Block[] => [{ type: 'text', text: 'The request the current work answers, verbatim:' }, ...pinned.content]

export const pinnedMessage = (path: Entry[], id?: string) => {
  const entry = id ? path.find(candidate => candidate.id === id) : undefined
  return entry && messageOf(entry)
}

const summaryMessage = (record: CompactionRecord, path: Entry[], kept: Entry[]): Message => {
  const pinned = kept.some(entry => entry.id === record.pinned) ? undefined : pinnedMessage(path, record.pinned)
  return { role: 'user', content: [{ type: 'text', text: summaryText(record) }, ...(pinned ? pinnedBlocks(pinned) : [])] }
}

export const compactedMessages = (path: Entry[]): Message[] => {
  const { record, entries } = view(path)
  return record ? [summaryMessage(record, path, entries), ...entries.map(messageOf)] : entries.map(messageOf)
}

const keptAfter = (path: Entry[], entry: Entry, { keep }: CompactionRecord) => {
  const start = keep ? path.findIndex(candidate => candidate.id === keep) : -1
  return path.slice(start === -1 ? path.findIndex(candidate => candidate.id === entry.id) + 1 : start)
}

export const compactionView: EntryView = {
  type: 'compaction',
  message(entry, path) {
    const record = entry.data as CompactionRecord
    return summaryMessage(record, path, keptAfter(path, entry, record))
  },
  resets(entry) {
    const { keep, thread } = entry.data as CompactionRecord
    return { keep, ...(thread && { thread }) }
  },
}
