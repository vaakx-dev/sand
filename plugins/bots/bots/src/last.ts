import type { Message } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import { type BotEntry, type LastLine, shownText } from './contract'

const maxLength = 200

const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/\*\*|__|~~|[*`]/g, '')

export const lastLine = (entries: BotEntry[]): LastLine | undefined => {
  for (const entry of entries) {
    const message = entry.data as Message
    const text = oneLine(plain(shownText(message)), maxLength)
    if (text) return { role: message.role, text, at: entry.at }
  }
  return undefined
}
