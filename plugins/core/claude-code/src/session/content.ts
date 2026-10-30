import type { ToolResultBlock, ToolResultContent, UserContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { fileText, unavailableText, type MediaBlock } from '@sand/chats/prompt'

const base64 = (mediaType: string, data: string) => ({ type: 'base64', media_type: mediaType, data })

const text = (value: string) => ({ type: 'text', text: value })

const mediaBlock = (block: MediaBlock, data: string) => {
  if (block.type === 'image') return { type: 'image', source: base64(block.mediaType, data) }
  if (block.mediaType === 'application/pdf') return { type: 'document', source: base64(block.mediaType, data), ...(block.name && { title: block.name }) }
  return text(block.name ? `${block.name}\n\n${data}` : data)
}

export const messageBlock = (media: Media) => (block: UserContent) => {
  switch (block.type) {
    case 'text':
      return text(block.text)
    case 'image':
    case 'document': {
      const data = media.data(block)
      return data === undefined ? text(unavailableText(block)) : mediaBlock(block, data)
    }
    case 'file':
      return text(fileText(block))
  }
}

const toolContent = (media: Media) => (item: ToolResultContent) => {
  if (item.type === 'tool_reference') return text(`The ${item.name} tool is now available.`)
  if (item.type === 'image') {
    const data = media.data(item)
    return data === undefined ? text(unavailableText(item)) : { type: 'image', data, mimeType: item.mediaType }
  }
  const block = messageBlock(media)(item)
  return block.type === 'text' ? block : text(`(${item.type} ${'name' in item && item.name ? item.name : ''})`)
}

export const toolResult = (result: ToolResultBlock, media: Media) => ({
  content: result.content.length ? result.content.map(toolContent(media)) : [text('(no output)')],
  isError: !!result.isError,
})
