import type { Block, DocumentBlock, ImageBlock, Message } from '@sand/protocol'
import { readFeedback, type Feedback } from './feedback'
import { isImageLabel } from './image'

export interface Notification {
  job: string
  label: string
  status: string
  result: string
}

export type UserPart =
  | { kind: 'text'; text: string }
  | { kind: 'image'; block: ImageBlock }
  | { kind: 'document'; block: DocumentBlock }
  | { kind: 'skill'; name: string }
  | { kind: 'notification'; notification: Notification }
  | { kind: 'feedback'; feedback: Feedback }

const tag = (source: string, name: string) => new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(source)?.[1]?.trim() ?? ''

const outer = (source: string, name: string) => {
  const start = source.indexOf(`<${name}>`)
  const end = source.lastIndexOf(`</${name}>`)
  return start < 0 || end < start ? '' : source.slice(start + name.length + 2, end).trim()
}

const notification = (text: string): Notification => ({
  job: tag(text, 'job'),
  label: tag(text, 'label') || 'task',
  status: tag(text, 'status') || 'done',
  result: outer(text, 'result'),
})

const part = (block: Block, next?: Block): UserPart[] => {
  if (block.type === 'image') return [{ kind: 'image', block }]
  if (block.type === 'document') return [{ kind: 'document', block }]
  if (block.type !== 'text' || !block.text.trim() || isImageLabel(block, next)) return []
  const skill = /^<skill name="([^"]+)"/.exec(block.text)?.[1]
  if (skill) return [{ kind: 'skill', name: skill }]
  if (block.text.startsWith('<task-notification>')) return [{ kind: 'notification', notification: notification(block.text) }]
  const feedback = readFeedback(block.text)
  if (feedback) return [{ kind: 'feedback', feedback }]
  return [{ kind: 'text', text: block.text }]
}

export const userParts = (message: Message) => message.content.flatMap((block, index) => part(block, message.content[index + 1]))

export const promptText = (message: Message, separator = '\n') =>
  userParts(message)
    .flatMap(part => (part.kind === 'text' ? [part.text] : []))
    .join(separator)
