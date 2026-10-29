import type { Block } from '../contract'

export const imageLabel = ({ name = 'image', path }: { name?: string; path?: string }) => (path ? `${name} (saved at ${path}):` : `${name}:`)

const signatures = [
  ['iVBORw0KGgo', 'image/png'],
  ['/9j/', 'image/jpeg'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
] as const

export const imageType = (base64: string | undefined, claimed: string) =>
  signatures.find(([prefix]) => base64?.startsWith(prefix))?.[1] ?? claimed

export const isImageLabel = (block: Block, next?: Block) => block.type === 'text' && next?.type === 'image' && block.text === imageLabel(next)
