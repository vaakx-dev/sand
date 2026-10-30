import { fileText, isUserContent, textOf, unavailableText } from '@sand/chats/prompt'
import type { Block, DocumentBlock, ImageBlock, Message, ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { withoutReferences } from '../http/deferred'
import { pair } from '../http/pair'

type ChatMessage = Record<string, unknown>

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

export interface Reading {
  media: Media
  images: boolean
}

const imageNote = '(An image was attached, but this model only reads text.)'

const documentText = (block: DocumentBlock, media: Media) => {
  if (block.mediaType !== 'text/plain') return `(A PDF${block.name ? ` named ${block.name}` : ''} was attached, but this model can't read it.)`
  const data = media.data(block)
  if (data === undefined) return unavailableText(block)
  return block.name ? `${block.name}\n\n${data}` : data
}

const imagePart = (block: ImageBlock, { media, images }: Reading): Part => {
  if (!images) return { type: 'text', text: imageNote }
  const data = media.data(block)
  return data === undefined ? { type: 'text', text: unavailableText(block) } : { type: 'image_url', image_url: { url: `data:${block.mediaType};base64,${data}` } }
}

const part = (block: UserContent, reading: Reading): Part => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text }
    case 'image':
      return imagePart(block, reading)
    case 'document':
      return { type: 'text', text: documentText(block, reading.media) }
    case 'file':
      return { type: 'text', text: fileText(block) }
  }
}

const contentOf = (parts: Part[]) =>
  parts.every(part => part.type === 'text') ? parts.map(part => (part.type === 'text' ? part.text : '')).join('\n\n') : parts

const toolText = (block: Exclude<UserContent, ImageBlock>, media: Media) => {
  switch (block.type) {
    case 'text':
      return block.text
    case 'document':
      return documentText(block, media)
    case 'file':
      return fileText(block)
  }
}

const resultContent = (result: ToolResultBlock) => withoutReferences(result.content)

const resultText = (result: ToolResultBlock, media: Media) =>
  resultContent(result)
    .flatMap(block => (block.type === 'image' ? [] : [toolText(block, media)]))
    .join('\n')
    .trim() || '(no output)'

const resultImages = (result: ToolResultBlock) => resultContent(result).filter((block): block is ImageBlock => block.type === 'image')

const userMessages = (content: Block[], reading: Reading): ChatMessage[] => {
  const results = content.flatMap(block =>
    block.type === 'tool_result' ? [{ role: 'tool', tool_call_id: block.callId, content: resultText(block, reading.media) }] : [],
  )
  const fromTools = content.flatMap(block => (block.type === 'tool_result' ? resultImages(block) : []))
  const parts = [...fromTools, ...content.filter(isUserContent)].map(block => part(block, reading))
  return [...results, ...(parts.length ? [{ role: 'user', content: contentOf(parts) }] : [])]
}

const assistantMessages = (content: Block[], safe: (name: string) => string): ChatMessage[] => {
  const text = textOf(content, '')
  const calls = content.flatMap(block =>
    block.type === 'tool_call'
      ? [{ id: block.id, type: 'function', function: { name: safe(block.name), arguments: JSON.stringify(block.input ?? {}) } }]
      : [],
  )
  if (!text && !calls.length) return []
  return [{ role: 'assistant', content: text || null, ...(calls.length && { tool_calls: calls }) }]
}

export const chatMessages = (system: string, messages: Message[], reading: Reading, safe: (name: string) => string): ChatMessage[] => [
  ...(system ? [{ role: 'system', content: system }] : []),
  ...pair(messages).flatMap(message => (message.role === 'user' ? userMessages(message.content, reading) : assistantMessages(message.content, safe))),
]
