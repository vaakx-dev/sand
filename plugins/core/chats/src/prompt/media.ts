import type { Block, DocumentBlock, ImageBlock, Message, ToolReferenceBlock } from '../contract'

export type MediaBlock = ImageBlock | DocumentBlock

export const isMediaBlock = (block: Block | ToolReferenceBlock): block is MediaBlock => block.type === 'image' || block.type === 'document'

export const mediaBlocks = (messages: Message[]): MediaBlock[] =>
  messages.flatMap(message =>
    message.content.flatMap(block => (block.type === 'tool_result' ? block.content.filter(isMediaBlock) : isMediaBlock(block) ? [block] : [])),
  )

export const unavailableText = (block: MediaBlock) => `[${block.type} unavailable: ${block.name ?? block.type}]`
