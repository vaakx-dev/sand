import type { Block, Message, Session } from '@sand/chats/contract'
import { textOf } from '@sand/chats/prompt'
import { oneLine } from '@sand/util'

const limit = 30_000

const blockText = (block: Block) => {
  if (block.type === 'text') return block.text
  if (block.type === 'tool_call') return `[${block.name}] ${oneLine(JSON.stringify(block.input), 300)}`
  if (block.type === 'tool_result') return `[result${block.isError ? ', error' : ''}] ${oneLine(textOf(block.content), 500)}`
  if (block.type === 'image' || block.type === 'document') return `[${block.type}]`
  return ''
}

const messageText = (message: Message, index: number) => `#${index} ${message.role}:\n${message.content.map(blockText).filter(Boolean).join('\n')}`

export const readThread = (session: Session, cursor = 0) => {
  const messages = session.messages()
  const text = messages
    .slice(cursor)
    .map((message, offset) => messageText(message, cursor + offset))
    .join('\n\n')
  const shown = text.length > limit ? `… ${text.length - limit} earlier characters omitted\n${text.slice(-limit)}` : text
  return `Thread ${session.id}\n\n${shown || '(no new messages)'}\n\n[cursor ${messages.length}]`
}
