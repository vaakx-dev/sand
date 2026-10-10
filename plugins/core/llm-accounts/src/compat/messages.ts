import type { Block, DocumentBlock, Message, ToolResultBlock, UserContent } from '@sand/messages'
import { pair } from '../http/pair'

export type ChatMessage = Record<string, unknown>

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

const imageNote = '(An image was attached, but this model only reads text.)'
const toolImageNote = '(The tool returned an image, but this model only reads text.)'

const documentText = (block: DocumentBlock) => {
  if (block.mediaType === 'text/plain' && block.data) return block.name ? `${block.name}\n\n${block.data}` : block.data
  const what = block.mediaType === 'application/pdf' ? 'A PDF' : 'A document'
  return `(${what}${block.name ? ` named ${block.name}` : ''} was attached, but this model can't read it.)`
}

const part = (block: UserContent, images: boolean): Part => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text }
    case 'image':
      return images ? { type: 'image_url', image_url: { url: `data:${block.mediaType};base64,${block.data}` } } : { type: 'text', text: imageNote }
    case 'document':
      return { type: 'text', text: documentText(block) }
  }
}

const contentOf = (parts: Part[]) =>
  parts.every(part => part.type === 'text') ? parts.map(part => (part.type === 'text' ? part.text : '')).join('\n\n') : parts

const resultText = (result: ToolResultBlock) =>
  result.content
    .map(block => (block.type === 'text' ? block.text : block.type === 'image' ? toolImageNote : documentText(block)))
    .join('\n')
    .trim() || '(no output)'

const userMessages = (content: Block[], images: boolean): ChatMessage[] => {
  const results = content.flatMap(block => (block.type === 'tool_result' ? [{ role: 'tool', tool_call_id: block.callId, content: resultText(block) }] : []))
  const parts = content.flatMap(block => (block.type === 'text' || block.type === 'image' || block.type === 'document' ? [part(block, images)] : []))
  return [...results, ...(parts.length ? [{ role: 'user', content: contentOf(parts) }] : [])]
}

const assistantMessages = (content: Block[], safe: (name: string) => string): ChatMessage[] => {
  const text = content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
  const calls = content.flatMap(block =>
    block.type === 'tool_call'
      ? [{ id: block.id, type: 'function', function: { name: safe(block.name), arguments: JSON.stringify(block.input ?? {}) } }]
      : [],
  )
  if (!text && !calls.length) return []
  return [{ role: 'assistant', content: text || null, ...(calls.length && { tool_calls: calls }) }]
}

export const chatMessages = (system: string, messages: Message[], images: boolean, safe: (name: string) => string): ChatMessage[] => [
  ...(system ? [{ role: 'system', content: system }] : []),
  ...pair(messages).flatMap(message => (message.role === 'user' ? userMessages(message.content, images) : assistantMessages(message.content, safe))),
]
