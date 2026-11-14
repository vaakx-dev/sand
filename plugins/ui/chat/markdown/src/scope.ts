import type { MathRenderer } from '@sand/math/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Refs } from './blocks/refs'
import type { FindCode } from './code/renderers'
import type { MarkdownFiles, MarkdownImage, MarkdownSize } from './contract'
import type { FindScheme } from './schemes'

export interface Renderers {
  kit: Kit
  math?: MathRenderer
  scheme: FindScheme
  code: FindCode
}

export interface Scope extends Renderers {
  refs: Refs
  image?: MarkdownImage
  files?: MarkdownFiles
  size?: MarkdownSize
  streaming?: boolean
  paragraph?: string
  tight?: boolean
}
