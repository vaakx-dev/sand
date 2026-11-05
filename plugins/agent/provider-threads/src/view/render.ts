import type { UsageRecord } from '@sand/accounts/contract'
import type { Block, Entry, Message } from '@sand/chats/contract'
import { modelSource } from '@sand/model/contract'
import type { Segment } from '@sand/turns-contract/contract'
import type { Basis } from './basis'
import type { Path } from './path'

export interface View {
  messages: Message[]
  delta: Message[]
}

const reasoning = new Set<Block['type']>(['thinking', 'redacted_thinking'])

export type TurnSource = (turn: string) => string | undefined

const producers = (path: Path, turnSource: TurnSource) => {
  const found = new Map<string, string>()
  let recorded: string | undefined
  for (let at = path.entries.length - 1; at >= 0; at--) {
    const entry = path.entries[at]!
    if (entry.type === 'usage') {
      const { model } = entry.data as UsageRecord
      recorded = model && modelSource(model)
      continue
    }
    const source = entry.turn ? turnSource(entry.turn) : recorded
    if (entry.type === 'message' && source) found.set(entry.id, source)
    recorded = undefined
  }
  return found
}

const joined = (messages: Message[]) =>
  messages.reduce<Message[]>((all, message) => {
    const last = all.at(-1)
    if (last?.role === 'user' && message.role === 'user') all[all.length - 1] = { role: 'user', content: [...last.content, ...message.content] }
    else all.push(message)
    return all
  }, [])

export const renderView = ({ segments, from }: Basis, path: Path, source: string, turnSource: TurnSource): View => {
  const made = producers(path, turnSource)

  const own = (entry: Entry, message: Message): Message | undefined => {
    const producer = made.get(entry.id)
    if (message.role !== 'assistant' || !producer || producer === source) return message
    const content = message.content.filter(block => !reasoning.has(block.type))
    return content.length ? { ...message, content } : undefined
  }

  const messageOf = (entry: Entry) => {
    const view = path.views.get(entry.type)
    const message = view?.message(entry, path.entries)
    return message && own(entry, message)
  }

  const range = (start: number, end: number) =>
    path.entries.slice(start, end).flatMap(entry => {
      const view = path.views.get(entry.type)
      const message = view && !view.resets ? messageOf(entry) : undefined
      return message ? [message] : []
    })

  const segment = (part: Segment) => {
    if ('summary' in part) {
      const message = messageOf(path.entries[path.index.get(part.summary)!]!)
      return message ? [message] : []
    }
    return range(path.index.get(part.entries[0])!, path.index.get(part.entries[1])! + 1)
  }

  const delta = range(from, path.entries.length)
  return { messages: joined([...segments.flatMap(segment), ...delta]), delta }
}
