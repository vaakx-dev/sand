import { fileText, isUserContent } from '@sand/kit'
import type { Block, Message, ToolResultBlock, UserContent } from '@sand/messages'
import { withoutReferences } from '../http/deferred'
import { pair } from '../http/pair'
import { decodeReasoning } from '../reasoning'

type Item = Record<string, unknown>

const part = (block: UserContent, images: boolean): Item => {
  switch (block.type) {
    case 'text':
      return { type: 'input_text', text: block.text }
    case 'image':
      return images
        ? { type: 'input_image', detail: 'auto', image_url: `data:${block.mediaType};base64,${block.data}` }
        : { type: 'input_text', text: '(An image was attached, but this model only reads text.)' }
    case 'document':
      return block.mediaType === 'application/pdf'
        ? { type: 'input_file', filename: block.name ?? 'document.pdf', file_data: `data:application/pdf;base64,${block.data}` }
        : { type: 'input_text', text: block.name ? `${block.name}\n\n${block.data}` : block.data }
    case 'file':
      return { type: 'input_text', text: fileText(block) }
  }
}

const output = (result: ToolResultBlock, images: boolean) => {
  const content = withoutReferences(result.content)
  if (content.every(block => block.type === 'text')) {
    const text = content.map(block => block.text).join('\n')
    return text || '(no output)'
  }
  return content.map(block => part(block, images))
}

const userItems = (content: Block[], images: boolean): Item[] => {
  const results = content.flatMap(block =>
    block.type === 'tool_result' ? [{ type: 'function_call_output', call_id: block.callId, output: output(block, images) }] : [],
  )
  const parts = content.flatMap(block => (isUserContent(block) ? [part(block, images)] : []))
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

export const openaiInput = (messages: Message[], images: boolean): Item[] =>
  pair(messages).flatMap(message =>
    message.role === 'user' ? userItems(message.content, images) : message.content.flatMap<Item>(block => assistantItem(block) ?? []),
  )
