import type { Block } from '@sand/protocol'

export const imageLabel = (image: { name?: string }) => `${image.name ?? 'image'}:`

export const isImageLabel = (block: Block, next?: Block) => block.type === 'text' && next?.type === 'image' && block.text === imageLabel(next)
