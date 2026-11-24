import { fileText, type MediaBlock, type ModelContent, type ToolResultBlock, type ToolResultContent, unavailableText } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'

type Part = { type: 'text'; text: string } | { type: 'image'; data: string; mediaType: string } | { type: 'pdf'; data: string; name?: string }

type PdfPart = Extract<Part, { type: 'pdf' }>

const text = (value: string): Part => ({ type: 'text', text: value })

const mediaPart = (block: MediaBlock, data: string): Part => {
  if (block.type === 'image') return { type: 'image', data, mediaType: block.mediaType }
  if (block.mediaType === 'application/pdf') return { type: 'pdf', data, ...(block.name && { name: block.name }) }
  return text(block.name ? `${block.name}\n\n${data}` : data)
}

const partOf = (media: Media) => (block: ModelContent): Part => {
  switch (block.type) {
    case 'text':
      return text(block.text)
    case 'image':
    case 'document': {
      const data = media.data(block)
      return data === undefined ? text(unavailableText(block)) : mediaPart(block, data)
    }
    case 'file':
      return text(fileText(block))
  }
}

const toolPart = (media: Media) => (item: ToolResultContent): Part =>
  item.type === 'tool_reference' ? text(`The ${item.name} tool is now available.`) : partOf(media)(item)

const parts = (content: ModelContent[], media: Media) => content.map(partOf(media))

const toolParts = (result: ToolResultBlock, media: Media) => (result.content.length ? result.content.map(toolPart(media)) : [text('(no output)')])

const unreadablePdf = ({ name }: PdfPart) => `(PDF ${name ?? ''} attached, which can't be read here)`

const mcpBlock = (part: Part) => {
  switch (part.type) {
    case 'text':
      return part
    case 'image':
      return { type: 'image', data: part.data, mimeType: part.mediaType }
    case 'pdf':
      return text(unreadablePdf(part))
  }
}

const mcpResult = (result: ToolResultBlock, media: Media) => ({ content: toolParts(result, media).map(mcpBlock), isError: !!result.isError })

export { mcpBlock, mcpResult, parts, toolParts, unreadablePdf, type Part }
