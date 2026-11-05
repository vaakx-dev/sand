import type { Block, Entry, Message } from '@sand/chats/contract'
import { modelSource } from '@sand/model/contract'
import type { Segment } from '@sand/turns-contract/contract'
import type { Basis } from './basis'
import type { Path } from './path'
import type { Producers } from './producers'

export interface View {
  messages: Message[]
  delta: Message[]
}

export interface Viewer {
  source: string
  made: Producers
  handoff(id: string): string | undefined
}

const reasoning = new Set<Block['type']>(['thinking', 'redacted_thinking'])

const joined = (messages: Message[]) =>
  messages.reduce<Message[]>((all, message) => {
    const last = all.at(-1)
    if (last?.role === 'user' && message.role === 'user') all[all.length - 1] = { role: 'user', content: [...last.content, ...message.content] }
    else all.push(message)
    return all
  }, [])

export const renderView = ({ segments, from }: Basis, path: Path, { source, made, handoff }: Viewer): View => {
  const own = (entry: Entry, message: Message): Message | undefined => {
    const producer = made.get(entry.id)
    if (message.role !== 'assistant' || !producer || modelSource(producer) === source) return message
    const content = message.content.filter(block => !reasoning.has(block.type))
    return content.length ? { ...message, content } : undefined
  }

  const messageOf = (entry: Entry) => {
    const message = path.views.get(entry.type)?.message(entry, path.entries)
    return message && own(entry, message)
  }

  const range = (start: number, end: number) =>
    path.entries.slice(start, end).flatMap(entry => {
      const view = path.views.get(entry.type)
      const message = view && !view.resets ? messageOf(entry) : undefined
      return message ? [message] : []
    })

  const segment = (part: Segment): Message[] => {
    if ('entries' in part) return range(path.index.get(part.entries[0])!, path.index.get(part.entries[1])! + 1)
    if ('handoff' in part) {
      const text = handoff(part.handoff)
      return text ? [{ role: 'user', content: [{ type: 'text', text }] }] : []
    }
    const message = messageOf(path.entries[path.index.get(part.summary)!]!)
    return message ? [message] : []
  }

  const delta = range(from, path.entries.length)
  return { messages: joined([...segments.flatMap(segment), ...delta]), delta }
}
