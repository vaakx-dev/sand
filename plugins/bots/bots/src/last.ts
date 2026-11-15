import { type Entry, type Message, plainText, saidText, textOf, typedByPerson } from '@sand/chats/contract'
import { oneLine } from '@sand/util'
import type { GistEntry, LastLine } from './contract'

const maxLength = 200

const shown = (message: Message) => message.role === 'assistant' || typedByPerson(message)

const lineOf = ({ id, data, at }: Entry): LastLine | undefined => {
  const message = data as Message
  if (!shown(message)) return undefined
  const said = message.role === 'user' ? saidText(message) : textOf(message.content, '\n')
  const text = oneLine(plainText(said), maxLength)
  return text ? { entry: id, role: message.role, text, at } : undefined
}

const gistOf = (line: LastLine, gist: Entry | undefined) => {
  const found = gist?.data as GistEntry | undefined
  return found?.entry === line.entry ? found.text : undefined
}

export const lastLine = (messages: Entry[], gist: Entry | undefined) => {
  const line = messages.map(lineOf).find(Boolean)
  const text = line && gistOf(line, gist)
  return text ? { ...line, gist: text } : line
}
