import type { Kit } from '@sand/ui-kit/contract'
import type { Refs } from './blocks/refs'
import type { MarkdownImage } from './contract'

export interface Scope {
  kit: Kit
  refs: Refs
  image?: MarkdownImage
}
