import type { LLMRequest } from '@sand/accounts/contract'
import { fileText } from '@sand/chats/prompt'
import type { Block, DocumentBlock, Message, ToolReferenceBlock } from '@sand/chats/contract'

const imageChars = 1600 * 4

const dataLength = (block: DocumentBlock) => (typeof block.data === 'string' ? block.data.length : block.size)

const charsOf = (block: Block | ToolReferenceBlock): number => {
  switch (block.type) {
    case 'text':
      return block.text.length
    case 'tool_reference':
      return block.name.length
    case 'thinking':
      return block.thinking.length
    case 'redacted_thinking':
      return block.data.length
    case 'tool_call':
      return block.name.length + JSON.stringify(block.input ?? null).length
    case 'tool_result':
      return block.content.reduce((sum, inner) => sum + charsOf(inner), 0)
    case 'image':
      return imageChars
    case 'document':
      return block.mediaType === 'application/pdf' ? Math.ceil(dataLength(block) / 50) : dataLength(block)
    case 'file':
      return fileText(block).length
  }
}

export const messageTokens = (message: Message) => Math.ceil(message.content.reduce((sum, block) => sum + charsOf(block), 0) / 4)

export const messagesTokens = (messages: Message[]) => messages.reduce((sum, message) => sum + messageTokens(message), 0)

export const requestTokens = (request: LLMRequest) =>
  Math.ceil((request.system.length + JSON.stringify(request.tools).length) / 4) + messagesTokens(request.messages)
