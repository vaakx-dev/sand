import type { Refs } from './blocks/refs'
import type { MarkdownImage } from './contract'

export interface Scope {
  refs: Refs
  image?: MarkdownImage
}
