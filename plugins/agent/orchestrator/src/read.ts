import { type Block, type Entry, type Message, type Session, textOf } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import type { ReadOptions, ThreadItem, ThreadPage, ThreadView } from './contract'

const defaultLimit = 50

const activityText = (block: Block) => {
  if (block.type === 'text') return block.text
  if (block.type === 'tool_call') return `[${block.name}] ${oneLine(JSON.stringify(block.input), 300)}`
  if (block.type === 'tool_result') return `[result${block.isError ? ', error' : ''}] ${oneLine(textOf(block.content), 500)}`
  return ''
}

const texts: Record<ThreadView, (message: Message) => string> = {
  messages: message => textOf(message.content),
  activity: message => message.content.map(activityText).filter(Boolean).join('\n'),
}

const itemsOf = (entry: Entry, view: ThreadView): ThreadItem[] => {
  if (entry.type !== 'message') return []
  const message = entry.data as Message
  const text = texts[view](message)
  return text ? [{ seq: entry.seq, at: entry.at, role: message.role, text, ...(entry.turn && { turn: entry.turn }) }] : []
}

export const readThread = (session: Session, { after, limit = defaultLimit, view = 'messages' }: ReadOptions): ThreadPage => {
  const all = session.path().flatMap(entry => itemsOf(entry, view))
  const later = after === undefined ? all : all.filter(item => item.seq > after)
  const items = after === undefined ? later.slice(-limit) : later.slice(0, limit)
  return { thread: session.id, items, next: items.at(-1)?.seq ?? after ?? 0, more: later.length > items.length && after !== undefined }
}
