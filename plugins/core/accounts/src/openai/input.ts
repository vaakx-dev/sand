import { fileText, isUserContent, unavailableText, type MediaBlock } from '@sand/chats/prompt'
import type { Block, Message, ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { withoutReferences } from '../http/deferred'
import { pair } from '../http/pair'
import { decodeReasoning } from '../reasoning'

type Item = Record<string, unknown>

interface Reading {
  media: Media
  images: boolean
}

const textItem = (text: string): Item => ({ type: 'input_text', text })

const mediaPart = (block: MediaBlock, data: string): Item => {
  if (block.type === 'image') return { type: 'input_image', detail: 'auto', image_url: `data:${block.mediaType};base64,${data}` }
  if (block.mediaType === 'application/pdf') return { type: 'input_file', filename: block.name ?? 'document.pdf', file_data: `data:application/pdf;base64,${data}` }
  return textItem(block.name ? `${block.name}\n\n${data}` : data)
}

const stored = (block: MediaBlock, { media, images }: Reading): Item => {
  if (block.type === 'image' && !images) return textItem('(An image was attached, but this model only reads text.)')
  const data = media.data(block)
  return data === undefined ? textItem(unavailableText(block)) : mediaPart(block, data)
}

const part = (block: UserContent, reading: Reading): Item => {
  switch (block.type) {
    case 'text':
      return textItem(block.text)
    case 'image':
    case 'document':
      return stored(block, reading)
    case 'file':
      return textItem(fileText(block))
  }
}

const output = (result: ToolResultBlock, reading: Reading) => {
  const content = withoutReferences(result.content)
  if (content.every(block => block.type === 'text')) {
    const text = content.map(block => block.text).join('\n')
    return text || '(no output)'
  }
  return content.map(block => part(block, reading))
}

const userItems = (content: Block[], reading: Reading): Item[] => {
  const results = content.flatMap(block =>
    block.type === 'tool_result' ? [{ type: 'function_call_output', call_id: block.callId, output: output(block, reading) }] : [],
  )
  const parts = content.flatMap(block => (isUserContent(block) ? [part(block, reading)] : []))
  return [...results, ...(parts.length ? [{ role: 'user', content: parts }] : [])]
}

const assistantItem = (block: Block): Item | undefined => {
  switch (block.type) {
    case 'text':
      return block.text ? { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: block.text, annotations: [] }], status: 'completed' } : undefined
    case 'thinking':
      return decodeReasoning(block.signature)
    case 'tool_call':
      return { type: 'function_call', call_id: block.id, name: block.name, arguments: JSON.stringify(block.input ?? {}) }
  }
}

export const openaiInput = (messages: Message[], reading: Reading): Item[] =>
  pair(messages).flatMap(message =>
    message.role === 'user' ? userItems(message.content, reading) : message.content.flatMap<Item>(block => assistantItem(block) ?? []),
  )
