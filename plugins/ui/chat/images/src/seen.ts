import type { Block, ImageBlock, Message, Session } from '@sand/chats/contract'

const imagesIn = (block: Block): ImageBlock[] => {
  if (block.type === 'image') return [block]
  if (block.type === 'tool_result') return block.content.flatMap(part => (part.type === 'image' ? [part] : []))
  return []
}

export const seenImage = (session: Session, name: string, before: number) =>
  session
    .path()
    .flatMap(entry => (entry.type === 'message' && entry.at <= before ? (entry.data as Message).content.flatMap(imagesIn) : []))
    .findLast(block => block.name === name && block.data !== undefined)
