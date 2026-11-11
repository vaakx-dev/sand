import { type Message, saidText, textOf, typedByPerson } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import type { BotEntry, GistEntry, LastLine } from './contract'

const maxLength = 200

const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/\*\*|__|~~|[*`]/g, '')

const shown = (message: Message) => message.role === 'assistant' || typedByPerson(message)

const lineOf = ({ id, data, at }: BotEntry): LastLine | undefined => {
  const message = data as Message
  if (!shown(message)) return undefined
  const said = message.role === 'user' ? saidText(message) : textOf(message.content, '\n')
  const text = oneLine(plain(said), maxLength)
  return text ? { entry: id, role: message.role, text, at } : undefined
}

const gistOf = (line: LastLine, gists: BotEntry[]) => gists.map(gist => gist.data as GistEntry).find(gist => gist.entry === line.entry)?.text

export const lastLine = (messages: BotEntry[], gists: BotEntry[]) => {
  const line = messages.map(lineOf).find(Boolean)
  const gist = line && gistOf(line, gists)
  return gist ? { ...line, gist } : line
}
