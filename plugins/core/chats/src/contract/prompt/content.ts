import type { Block, ModelContent, Prompt, UserContent } from '..'

const modelTypes = new Set<Block['type']>(['text', 'image', 'document', 'file'])

export const isModelContent = (block: Block): block is ModelContent => modelTypes.has(block.type)

export const promptContent = (prompt: Prompt): UserContent[] => (typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt)
