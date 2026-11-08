import type { MathRenderer } from '@sand/math/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Refs } from './blocks/refs'
import type { MarkdownImage } from './contract'
import type { FindScheme } from './schemes'

export interface Renderers {
  kit: Kit
  math?: MathRenderer
  scheme: FindScheme
}

export interface Scope extends Renderers {
  refs: Refs
  image?: MarkdownImage
  streaming?: boolean
}
