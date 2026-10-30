import type { ImageBlock, Message, ToolResultContent } from '@sand/chats/contract'
import type { ImageOptions } from '@sand/media/web/contract'
import type { Threads } from '@sand/web-client/contract'

export type Sender = 'you' | 'sand'

export const senderNames: Record<Sender, string> = { you: 'You', sand: 'sand' }

export interface ThreadImage {
  block: ImageBlock
  sender: Sender
}

export type Picture = (block: ImageBlock, options: ImageOptions) => HTMLElement

const imagesIn = (content: ToolResultContent[], sender: Sender): ThreadImage[] =>
  content.flatMap(block => (block.type === 'image' ? [{ block, sender }] : []))

const userImages = (message: Message): ThreadImage[] =>
  message.content.flatMap(block => {
    if (block.type === 'image') return [{ block, sender: 'you' }]
    if (block.type === 'tool_result') return imagesIn(block.content, 'sand')
    return []
  })

const resultIds = (messages: Message[]) => new Set(messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_result' ? [block.callId] : []))))

const threadImages = (threads: Threads, thread: string): ThreadImage[] => {
  const messages = threads.path(thread).flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))
  const saved = resultIds(messages)
  const live = [...(threads.get(thread)?.tools.results.values() ?? [])].filter(result => !saved.has(result.callId))
  return [...messages.filter(message => message.role === 'user').flatMap(userImages), ...live.flatMap(result => imagesIn(result.content, 'sand'))]
}

export const galleryOf = (threads: Threads, thread: string, block: ImageBlock) => {
  const images = threadImages(threads, thread)
  const start = images.findIndex(image => image.block.hash === block.hash)
  return start < 0 ? { images: [{ block, sender: 'sand' as const }], start: 0 } : { images, start }
}
