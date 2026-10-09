import type { Entry, Message } from '@sand/messages'
import type { CompactionRecord } from '../contract'

export interface View {
  record?: CompactionRecord
  entries: Entry[]
}

const messageEntries = (entries: Entry[]) => entries.filter(entry => entry.type === 'message')

export const messageOf = (entry: Entry) => entry.data as Message

export const isPrompt = (message: Message) => message.role === 'user' && !message.content.some(block => block.type === 'tool_result')

export const view = (path: Entry[]): View => {
  const index = path.findLastIndex(entry => entry.type === 'compaction')
  if (index === -1) return { entries: messageEntries(path) }
  const record = path[index]!.data as CompactionRecord
  const start = record.keep ? path.findIndex(entry => entry.id === record.keep) : -1
  const kept = start === -1 ? [] : path.slice(start, index)
  return { record, entries: messageEntries([...kept, ...path.slice(index + 1)]) }
}
