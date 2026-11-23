import { fileText, type MediaBlock, type ModelContent, type ToolResultBlock, type ToolResultContent, unavailableText } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'

type AcpBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

function textBlock(text: string): AcpBlock {
  return { type: 'text', text }
}

function mediaBlock(block: MediaBlock, data: string): AcpBlock {
  if (block.type === 'image') return { type: 'image', data, mimeType: block.mediaType }
  return textBlock(block.name ? `${block.name}\n\n${data}` : data)
}

function contentBlock(block: ModelContent, media: Media): AcpBlock {
  switch (block.type) {
    case 'text':
      return textBlock(block.text)
    case 'image':
    case 'document': {
      const data = media.data(block)
      return data === undefined ? textBlock(unavailableText(block)) : mediaBlock(block, data)
    }
    case 'file':
      return textBlock(fileText(block))
  }
}

function promptBlocks(content: ModelContent[], media: Media): AcpBlock[] {
  const blocks = content.map(block => contentBlock(block, media))
  return blocks.length > 0 ? blocks : [textBlock('')]
}

function toolResultItem(item: ToolResultContent, media: Media): AcpBlock {
  if (item.type === 'tool_reference') return textBlock(`The ${item.name} tool is now available.`)
  if (item.type === 'image') {
    const data = media.data(item)
    return data === undefined ? textBlock(unavailableText(item)) : { type: 'image', data, mimeType: item.mediaType }
  }
  return contentBlock(item, media)
}

function toolResultPayload(result: ToolResultBlock, media: Media) {
  return {
    content: result.content.length > 0 ? result.content.map(item => toolResultItem(item, media)) : [textBlock('(no output)')],
    isError: Boolean(result.isError),
  }
}

export { promptBlocks, toolResultPayload }
