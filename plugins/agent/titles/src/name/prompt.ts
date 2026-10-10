import type { Message } from '@sand/messages'
import { promptText } from '@sand/kit'

const half = 3000

export const system = [
  'You name threads in a coding assistant.',
  'Reply with the name only: 3 to 6 words, sentence case, no quotes, no full stop.',
  'Say what the user wants done, like "Fix login redirect loop" or "Add dark mode to settings".',
].join(' ')

const textOf = (message: Message) =>
  message.role === 'user' ? promptText(message, ' ') : message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(' ')

const line = (message: Message) => {
  const text = textOf(message).replace(/\s+/g, ' ').trim()
  return text ? [`${message.role === 'user' ? 'User' : 'Assistant'}: ${text}`] : []
}

export const conversation = (messages: Message[]) => {
  const text = messages.flatMap(line).join('\n\n')
  return text.length > half * 2 ? `${text.slice(0, half)}\n\n…\n\n${text.slice(-half)}` : text
}
