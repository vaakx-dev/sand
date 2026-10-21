import type { Block, ToolReferenceBlock } from '../contract'

export const textOf = (content: (Block | ToolReferenceBlock)[], separator = '\n') =>
  content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(separator)
