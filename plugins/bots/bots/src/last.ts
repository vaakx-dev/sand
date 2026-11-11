import { type Message, saidText, textOf, typedByPerson } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import type { BotEntry, LastLine } from './contract'

const maxLength = 200

const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/\*\*|__|~~|[*`]/g, '')

const shown = (message: Message) => message.role === 'assistant' || typedByPerson(message)

const lineOf = ({ data, at }: BotEntry): LastLine | undefined => {
  const message = data as Message
  if (!shown(message)) return undefined
  const said = message.role === 'user' ? saidText(message) : textOf(message.content, '\n')
  const text = oneLine(plain(said), maxLength)
  return text ? { role: message.role, text, at } : undefined
}

export const lastLine = (entries: BotEntry[]) => entries.map(lineOf).find(Boolean)
