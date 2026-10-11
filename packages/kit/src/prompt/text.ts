import type { Block } from '@sand/messages'

export const textOf = (content: Block[], separator = '\n') =>
  content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(separator)
