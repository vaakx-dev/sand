import type { Block, Message, UserPart } from '..'
import { isContextEnvelope, restoreLinks } from './context'
import { readFeedback } from './feedback'
import { isImageLabel } from './image'

const part = (block: Block, content: Block[], next?: Block): UserPart[] => {
  if (block.type === 'image') return [{ kind: 'image', block }]
  if (block.type === 'document') return [{ kind: 'document', block }]
  if (block.type === 'file') return [{ kind: 'file', block }]
  if (block.type === 'context') return [{ kind: 'context', records: block.records }]
  if (block.type !== 'text' || !block.text.trim() || isImageLabel(block, next) || isContextEnvelope(block, next)) return []
  const skill = /^<skill name="([^"]+)"/.exec(block.text)?.[1]
  if (skill) return [{ kind: 'skill', name: skill }]
  const feedback = readFeedback(block.text)
  if (feedback) return [{ kind: 'feedback', feedback }]
  return [{ kind: 'text', text: restoreLinks(block.text, content) }]
}

export const userParts = ({ content }: Message) => content.flatMap((block, index) => part(block, content, content[index + 1]))

export const promptText = (message: Message, separator = '\n') =>
  userParts(message)
    .flatMap(part => (part.kind === 'text' ? [part.text] : []))
    .join(separator)
