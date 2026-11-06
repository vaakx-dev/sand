import type { CallToolResult, ContentBlock } from '@modelcontextprotocol/client'
import type { ToolResultContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import type { ToolOutput } from '@sand/tools/contract'

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

const text = (value: string): ToolResultContent => ({ type: 'text', text: value })

const blockOf = (media: Media, block: ContentBlock): ToolResultContent => {
  switch (block.type) {
    case 'text':
      return text(block.text)
    case 'image':
      return imageTypes.has(block.mimeType) ? { type: 'image', ...media.put(Buffer.from(block.data, 'base64'), block.mimeType) } : text(`[${block.mimeType} image not shown]`)
    case 'audio':
      return text(`[${block.mimeType} audio not shown]`)
    case 'resource_link':
      return text(`${block.name}: ${block.uri}`)
    case 'resource':
      return text('text' in block.resource ? block.resource.text : `[${block.resource.mimeType ?? 'binary'} resource ${block.resource.uri} not shown]`)
  }
}

const textOf = (blocks: ToolResultContent[]) => blocks.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

export const outputOf = (media: Media, result: CallToolResult): ToolOutput => {
  const blocks = result.content.map(block => blockOf(media, block))
  if (result.isError) throw new Error(textOf(blocks) || 'The MCP server reported an error without a message')
  if (blocks.length) return blocks
  return result.structuredContent === undefined ? '' : JSON.stringify(result.structuredContent)
}
