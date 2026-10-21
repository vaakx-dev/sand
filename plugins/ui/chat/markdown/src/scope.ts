import type { MathRenderer } from '@sand/math/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Refs } from './blocks/refs'
import type { MarkdownImage } from './contract'

export interface Renderers {
  kit: Kit
  math?: MathRenderer
}

export interface Scope extends Renderers {
  refs: Refs
  image?: MarkdownImage
  streaming?: boolean
}
