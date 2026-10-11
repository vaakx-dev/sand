import type { ImageBlock, Message, UserContent } from '@sand/messages'
import type { Props } from '@sand/dom'
import type { Threads } from '@sand/web-client/contract'

export type Sender = 'you' | 'sand'

export const senderNames: Record<Sender, string> = { you: 'You', sand: 'sand' }

export interface ThreadImage {
  block: ImageBlock
  sender: Sender
}

export type Picture = (block: ImageBlock, props: Props<HTMLImageElement>) => HTMLImageElement

const imagesIn = (content: UserContent[], sender: Sender): ThreadImage[] =>
  content.flatMap(block => (block.type === 'image' ? [{ block, sender }] : []))

const userImages = (message: Message): ThreadImage[] =>
  message.content.flatMap(block => {
    if (block.type === 'image') return [{ block, sender: 'you' }]
    if (block.type === 'tool_result') return imagesIn(block.content, 'sand')
    return []
  })

const resultIds = (messages: Message[]) => new Set(messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_result' ? [block.callId] : []))))

const source = (block: ImageBlock) => block.data ?? block.blob

export const threadImages = (threads: Threads, thread: string): ThreadImage[] => {
  const messages = threads.path(thread).flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))
  const saved = resultIds(messages)
  const live = [...(threads.get(thread)?.tools.results.values() ?? [])].filter(result => !saved.has(result.callId))
  return [...messages.filter(message => message.role === 'user').flatMap(userImages), ...live.flatMap(result => imagesIn(result.content, 'sand'))]
}

export const indexOfImage = (images: ThreadImage[], block: ImageBlock) => images.findIndex(image => source(image.block) === source(block))
