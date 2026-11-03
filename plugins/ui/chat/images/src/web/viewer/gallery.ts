import type { ImageBlock, Message, ToolResultContent } from '@sand/chats/contract'
import type { ImageOptions, ImageSource } from '@sand/media/web/contract'
import type { Threads } from '@sand/web-client/contract'

export type Sender = 'you' | 'sand'

export const senderNames: Record<Sender, string> = { you: 'You', sand: 'sand' }

export interface Picture {
  source: ImageSource
  sender: Sender
  name?: string | undefined
}

export type Draw = (picture: Picture, options: ImageOptions) => HTMLElement

const stored = (block: ImageBlock, sender: Sender): Picture => ({ source: { block }, sender, name: block.name })

const imagesIn = (content: ToolResultContent[], sender: Sender): Picture[] =>
  content.flatMap(block => (block.type === 'image' ? [stored(block, sender)] : []))

const userImages = (message: Message): Picture[] =>
  message.content.flatMap(block => {
    if (block.type === 'image') return [stored(block, 'you')]
    if (block.type === 'tool_result') return imagesIn(block.content, 'sand')
    return []
  })

const resultIds = (messages: Message[]) => new Set(messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_result' ? [block.callId] : []))))

const threadImages = (threads: Threads, thread: string): Picture[] => {
  const messages = threads.path(thread).flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))
  const saved = resultIds(messages)
  const live = [...(threads.get(thread)?.tools.results.values() ?? [])].filter(result => !saved.has(result.callId))
  return [...messages.filter(message => message.role === 'user').flatMap(userImages), ...live.flatMap(result => imagesIn(result.content, 'sand'))]
}

export const galleryOf = (threads: Threads, thread: string, block: ImageBlock) => {
  const images = threadImages(threads, thread)
  const start = images.findIndex(image => 'block' in image.source && image.source.block.hash === block.hash)
  return start < 0 ? { images: [stored(block, 'sand')], start: 0 } : { images, start }
}
