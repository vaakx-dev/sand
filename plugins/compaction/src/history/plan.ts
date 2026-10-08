import type { CompactionRecord, Entry, Message } from '@sand/protocol'
import { messageTokens } from '../measure/estimate'
import { pinnedMessage } from './rewrite'
import { isPrompt, messageOf, view } from './view'

const pinLimit = 10_000

export interface Plan {
  dropped: Message[]
  keep: string
  pinned?: string
  previous?: CompactionRecord
}

const canStart = (message: Message) => message.role === 'assistant' || isPrompt(message)

const cutIndex = (messages: Message[], keep: number) => {
  let total = 0
  for (let index = messages.length - 1; index >= 0; index--) {
    total += messageTokens(messages[index]!)
    if (total < keep) continue
    const after = messages.findIndex((message, candidate) => candidate >= index && canStart(message))
    return after === -1 ? messages.findLastIndex(canStart) : after
  }
  return -1
}

const pinnedOf = (path: Entry[], entries: Entry[], cut: number, previous?: CompactionRecord) => {
  const messages = entries.map(messageOf)
  if (isPrompt(messages[cut]!)) return undefined
  const prompt = messages.slice(0, cut).findLastIndex(isPrompt)
  const id = prompt === -1 ? previous?.pinned : entries[prompt]!.id
  const message = prompt === -1 ? pinnedMessage(path, previous?.pinned) : messages[prompt]
  return message && messageTokens(message) <= pinLimit ? id : undefined
}

export const plan = (path: Entry[], keep: number): Plan | undefined => {
  const { record, entries } = view(path)
  const messages = entries.map(messageOf)
  const cut = cutIndex(messages, keep)
  if (cut <= 0) return undefined
  const pinned = pinnedOf(path, entries, cut, record)
  return { dropped: messages.slice(0, cut), keep: entries[cut]!.id, ...(pinned && { pinned }), ...(record && { previous: record }) }
}
