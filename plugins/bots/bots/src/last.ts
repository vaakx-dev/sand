import { type Message, saidText, textOf } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import type { BotEntry, LastLine } from './contract'

const maxLength = 200

const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/\*\*|__|~~|[*`]/g, '')

export const lastLine = (entries: BotEntry[]): LastLine | undefined => {
  for (const entry of entries) {
    const message = entry.data as Message
    const said = message.role === 'user' ? saidText(message) : textOf(message.content, '\n')
    const text = oneLine(plain(said), maxLength)
    if (text) return { role: message.role, text, at: entry.at }
  }
  return undefined
}
