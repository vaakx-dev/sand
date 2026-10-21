import type { Block, Message, ToolResultContent } from '@sand/chats/contract'
import { fileText } from '@sand/chats/prompt'

const resultLimit = 4_000

const blockMark = (block: Block) => {
  if (block.type === 'tool_call') return `call:${block.id}`
  if (block.type === 'tool_result') return `result:${block.callId}`
  if (block.type === 'text') return `text:${block.text}`
  return block.type
}

export const markOf = ({ role, content }: Message) =>
  role === 'assistant' ? `assistant:${content.flatMap(block => (block.type === 'tool_call' ? [block.id] : [])).join(',')}` : `user:${content.map(blockMark).join('|')}`

const clip = (text: string) => (text.length > resultLimit ? `${text.slice(0, resultLimit)}… (cut)` : text)

const contentText = (content: ToolResultContent[]) =>
  content
    .map(item => {
      if (item.type === 'text') return item.text
      if (item.type === 'file') return fileText(item)
      if (item.type === 'tool_reference') return `(tool ${item.name} is available)`
      return `(${item.type}${item.name ? ` ${item.name}` : ''})`
    })
    .join('\n')

const blockText = (block: Block): string | undefined => {
  switch (block.type) {
    case 'text':
      return block.text
    case 'file':
      return fileText(block)
    case 'image':
    case 'document':
      return `(${block.type}${block.name ? ` ${block.name}` : ''})`
    case 'tool_call':
      return `[called ${block.name} ${JSON.stringify(block.input ?? {})}]`
    case 'tool_result':
      return `[${block.isError ? 'error' : 'result'}: ${clip(contentText(block.content))}]`
    default:
      return undefined
  }
}

export const transcript = (messages: Message[]) =>
  messages
    .map(({ role, content }) => {
      const text = content.flatMap(block => blockText(block) ?? []).join('\n')
      return text ? `${role === 'user' ? 'User' : 'Assistant'}:\n${text}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
