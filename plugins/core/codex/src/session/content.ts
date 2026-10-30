import type { ImageBlock, ToolResultBlock, ToolResultContent, UserContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { fileText, unavailableText } from '@sand/chats/prompt'

const dataUrl = (mediaType: string, data: string) => `data:${mediaType};base64,${data}`

const asText = (block: Exclude<UserContent, ImageBlock>, media: Media) => {
  switch (block.type) {
    case 'text':
      return block.text
    case 'file':
      return fileText(block)
    case 'document': {
      if (block.mediaType !== 'text/plain') return `(PDF ${block.name ?? ''} attached, which Codex can't read here)`
      const data = media.data(block)
      if (data === undefined) return unavailableText(block)
      return block.name ? `${block.name}\n\n${data}` : data
    }
  }
}

export const inputItem = (media: Media) => (block: UserContent) => {
  if (block.type !== 'image') return { type: 'text', text: asText(block, media), text_elements: [] }
  const data = media.data(block)
  return data === undefined ? { type: 'text', text: unavailableText(block), text_elements: [] } : { type: 'image', url: dataUrl(block.mediaType, data) }
}

const outputItem = (media: Media) => (item: ToolResultContent) => {
  if (item.type === 'tool_reference') return { type: 'inputText', text: `The ${item.name} tool is now available.` }
  if (item.type !== 'image') return { type: 'inputText', text: asText(item, media) }
  const data = media.data(item)
  return data === undefined ? { type: 'inputText', text: unavailableText(item) } : { type: 'inputImage', imageUrl: dataUrl(item.mediaType, data) }
}

export const toolOutput = (result: ToolResultBlock, media: Media) => ({
  contentItems: result.content.length ? result.content.map(outputItem(media)) : [{ type: 'inputText', text: '(no output)' }],
  success: !result.isError,
})
