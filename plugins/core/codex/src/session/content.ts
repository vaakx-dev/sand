import type { ToolResultBlock, ToolResultContent, UserContent } from '@sand/chats/contract'
import { fileText } from '@sand/chats/prompt'

const dataUrl = (mediaType: string, data: string) => `data:${mediaType};base64,${data}`

const asText = (block: UserContent) => {
  switch (block.type) {
    case 'text':
      return block.text
    case 'file':
      return fileText(block)
    case 'document':
      if (block.mediaType === 'text/plain' && block.data) return block.name ? `${block.name}\n\n${block.data}` : block.data
      return `(PDF ${block.name ?? ''} attached, which Codex can't read here)`
    case 'image':
      return `(image ${block.name ?? ''} not available)`
  }
}

export const inputItem = (block: UserContent) =>
  block.type === 'image' && block.data ? { type: 'image', url: dataUrl(block.mediaType, block.data) } : { type: 'text', text: asText(block), text_elements: [] }

const outputItem = (item: ToolResultContent) => {
  if (item.type === 'image' && item.data) return { type: 'inputImage', imageUrl: dataUrl(item.mediaType, item.data) }
  if (item.type === 'tool_reference') return { type: 'inputText', text: `The ${item.name} tool is now available.` }
  return { type: 'inputText', text: asText(item) }
}

export const toolOutput = (result: ToolResultBlock) => ({
  contentItems: result.content.length ? result.content.map(outputItem) : [{ type: 'inputText', text: '(no output)' }],
  success: !result.isError,
})
