import type { Message } from '@sand/messages'
import { promptText, userParts } from '@sand/kit'

const maxLength = 50

const fileNames = (message: Message) =>
  userParts(message).flatMap(part => (part.kind === 'image' || part.kind === 'document' ? [part.block.name ?? part.block.type] : []))

const promptWords = (message: Message) =>
  [promptText(message, ' '), ...fileNames(message)].join(' ').replace(/\s+/g, ' ').trim()

const shorten = (text: string, max = maxLength) => {
  if (text.length <= max) return text
  const cut = text.slice(0, max + 1)
  const space = cut.lastIndexOf(' ')
  const kept = space > max * 0.6 ? cut.slice(0, space) : text.slice(0, max)
  return `${kept.replace(/[\s.,;:!?-]+$/, '')}…`
}

export const titleOf = (message: Message) => shorten(promptWords(message))
