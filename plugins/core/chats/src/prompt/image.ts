import type { Block } from '../contract'

const labelPrefix = (name = 'image') => `${name} (saved at `

export const imageLabel = (name: string | undefined, path: string) => `${labelPrefix(name)}${path}):`

export const isImageLabel = (block: Block, next?: Block) =>
  block.type === 'text' && next?.type === 'image' && block.text.startsWith(labelPrefix(next.name)) && block.text.endsWith('):')
