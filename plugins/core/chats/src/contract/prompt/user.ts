import type { Block, Message, UserPart } from '..'
import { readFeedback } from './feedback'
import { isImageLabel } from './image'

const part = (block: Block, next?: Block): UserPart[] => {
  if (block.type === 'image') return [{ kind: 'image', block }]
  if (block.type === 'document') return [{ kind: 'document', block }]
  if (block.type === 'file') return [{ kind: 'file', block }]
  if (block.type === 'context') return [{ kind: 'context', records: block.records }]
  if (block.type !== 'text' || isImageLabel(block, next)) return []
  const text = block.typed ?? block.text
  if (!text.trim()) return []
  const skill = /^<skill name="([^"]+)"/.exec(text)?.[1]
  if (skill) return [{ kind: 'skill', name: skill }]
  const feedback = readFeedback(text)
  if (feedback) return [{ kind: 'feedback', feedback }]
  return [{ kind: 'text', text }]
}

export const userParts = (message: Message) => message.content.flatMap((block, index) => part(block, message.content[index + 1]))

export const promptText = (message: Message, separator = '\n') =>
  userParts(message)
    .flatMap(part => (part.kind === 'text' ? [part.text] : []))
    .join(separator)

export const saidText = (message: Message, separator = '\n') =>
  promptText(message, separator).trim() || userParts(message).flatMap(part => ('block' in part ? [part.block.name ?? part.kind] : [])).join(', ')
