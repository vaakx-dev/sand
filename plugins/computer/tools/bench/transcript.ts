import type { Block, Message, ToolResultContent } from '@sand/chats/contract'

const callLength = 240
const resultLength = 600

const clip = (text: string, length: number) => (text.length > length ? `${text.slice(0, length)}…` : text)

const partText = (part: ToolResultContent) => {
  if (part.type === 'text') return part.text
  return part.type === 'image' ? '[screenshot]' : `[${part.type}]`
}

const resultText = (content: ToolResultContent[]) => content.map(partText).join(' ')

const lineOf = (block: Block) => {
  switch (block.type) {
    case 'text':
      return block.text.trim() && `said: ${block.text.trim()}`
    case 'tool_call':
      return `${block.name} ${clip(JSON.stringify(block.input), callLength)}`
    case 'tool_result':
      return `  → ${block.isError ? 'error: ' : ''}${clip(resultText(block.content), resultLength)}`
    default:
      return ''
  }
}

export const transcriptOf = (messages: Message[]) =>
  messages
    .slice(1)
    .flatMap(message => message.content.map(lineOf))
    .filter(Boolean)
