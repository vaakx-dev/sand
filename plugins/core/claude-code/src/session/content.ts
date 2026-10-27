import type { ToolResultBlock, ToolResultContent, UserContent } from '@sand/chats/contract'
import { fileText, imageType } from '@sand/chats/prompt'

const base64 = (mediaType: string, data: string) => ({ type: 'base64', media_type: mediaType, data })

export const messageBlock = (block: UserContent) => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text }
    case 'image':
      return block.data ? { type: 'image', source: base64(imageType(block.data, block.mediaType), block.data) } : { type: 'text', text: `(image ${block.name ?? ''} not available)` }
    case 'document':
      if (!block.data) return { type: 'text', text: `(document ${block.name ?? ''} not available)` }
      if (block.mediaType === 'application/pdf') return { type: 'document', source: base64(block.mediaType, block.data), ...(block.name && { title: block.name }) }
      return { type: 'text', text: block.name ? `${block.name}\n\n${block.data}` : block.data }
    case 'file':
      return { type: 'text', text: fileText(block) }
  }
}

const toolContent = (item: ToolResultContent) => {
  if (item.type === 'image' && item.data) return { type: 'image', data: item.data, mimeType: item.mediaType }
  if (item.type === 'tool_reference') return { type: 'text', text: `The ${item.name} tool is now available.` }
  const block = messageBlock(item)
  return block.type === 'text' ? block : { type: 'text', text: `(${item.type} ${'name' in item && item.name ? item.name : ''})` }
}

export const toolResult = (result: ToolResultBlock) => ({
  content: result.content.length ? result.content.map(toolContent) : [{ type: 'text', text: '(no output)' }],
  isError: !!result.isError,
})
