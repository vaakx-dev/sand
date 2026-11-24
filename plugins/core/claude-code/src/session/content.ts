import { parts, type Part } from '@sand/app-plan'
import type { ModelContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'

const base64 = (mediaType: string, data: string) => ({ type: 'base64', media_type: mediaType, data })

const messageBlock = (part: Part) => {
  switch (part.type) {
    case 'text':
      return part
    case 'image':
      return { type: 'image', source: base64(part.mediaType, part.data) }
    case 'pdf':
      return { type: 'document', source: base64('application/pdf', part.data), ...(part.name && { title: part.name }) }
  }
}

export const messageBlocks = (content: ModelContent[], media: Media) => parts(content, media).map(messageBlock)
