import type { Block, Message, UserContent } from '@sand/protocol'

const textLimit = 16_000
const resultLimit = 2_000
const inputLimit = 800

const clip = (text: string, limit: number) =>
  text.length <= limit ? text : `${text.slice(0, limit)}\n[… ${text.length - limit} more characters]`

const contentText = (content: UserContent[]) =>
  content
    .map(block => {
      if (block.type === 'text') return block.text
      if (block.type === 'image') return '[image]'
      return block.mediaType === 'text/plain' ? block.data : `[pdf${block.name ? ` ${block.name}` : ''}]`
    })
    .join('\n')

const line = (speaker: string, text: string, limit: number) => (text.trim() ? [`[${speaker}]: ${clip(text.trim(), limit)}`] : [])

const blockLines = (role: Message['role'], block: Block): string[] => {
  const speaker = role === 'user' ? 'User' : 'Assistant'
  switch (block.type) {
    case 'text':
      return line(speaker, block.text, textLimit)
    case 'image':
    case 'document':
      return line(speaker, contentText([block]), textLimit)
    case 'thinking':
      return line('Assistant thinking', block.thinking, resultLimit)
    case 'redacted_thinking':
      return []
    case 'tool_call':
      return [`[Tool call]: ${block.name}(${clip(JSON.stringify(block.input ?? null), inputLimit)})`]
    case 'tool_result':
      return line(block.isError ? 'Tool error' : 'Tool result', contentText(block.content) || '(empty)', resultLimit)
  }
}

export const serialize = (message: Message) => message.content.flatMap(block => blockLines(message.role, block)).join('\n\n')
