import type { Block, Message, UserPart } from '../contract'
import { readFeedback } from './feedback'
import { isImageLabel } from './image'

const part = (block: Block, next?: Block): UserPart[] => {
  if (block.type === 'image') return [{ kind: 'image', block }]
  if (block.type === 'document') return [{ kind: 'document', block }]
  if (block.type === 'file') return [{ kind: 'file', block }]
  if (block.type !== 'text' || !block.text.trim() || isImageLabel(block, next)) return []
  const skill = /^<skill name="([^"]+)"/.exec(block.text)?.[1]
  if (skill) return [{ kind: 'skill', name: skill }]
  const feedback = readFeedback(block.text)
  if (feedback) return [{ kind: 'feedback', feedback }]
  return [{ kind: 'text', text: block.text }]
}

export const userParts = (message: Message) => message.content.flatMap((block, index) => part(block, message.content[index + 1]))

export const promptText = (message: Message, separator = '\n') =>
  userParts(message)
    .flatMap(part => (part.kind === 'text' ? [part.text] : []))
    .join(separator)
