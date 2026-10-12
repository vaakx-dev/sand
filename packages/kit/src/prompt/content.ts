import type { Block, Prompt, UserContent } from '@sand/messages'

const userTypes = new Set<Block['type']>(['text', 'image', 'document', 'file'])

export const isUserContent = (block: Block): block is UserContent => userTypes.has(block.type)

export const promptContent = (prompt: Prompt): UserContent[] => (typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt)
