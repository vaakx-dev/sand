import { type Part, parts, toolParts, unreadablePdf } from '@sand/app-plan'
import type { ModelContent, ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'

const dataUrl = (mediaType: string, data: string) => `data:${mediaType};base64,${data}`

const inputItem = (part: Part) => {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text, text_elements: [] }
    case 'image':
      return { type: 'image', url: dataUrl(part.mediaType, part.data) }
    case 'pdf':
      return { type: 'text', text: unreadablePdf(part), text_elements: [] }
  }
}

const outputItem = (part: Part) => {
  switch (part.type) {
    case 'text':
      return { type: 'inputText', text: part.text }
    case 'image':
      return { type: 'inputImage', imageUrl: dataUrl(part.mediaType, part.data) }
    case 'pdf':
      return { type: 'inputText', text: unreadablePdf(part) }
  }
}

export const inputItems = (content: ModelContent[], media: Media) => parts(content, media).map(inputItem)

export const toolOutput = (result: ToolResultBlock, media: Media) => ({ contentItems: toolParts(result, media).map(outputItem), success: !result.isError })
