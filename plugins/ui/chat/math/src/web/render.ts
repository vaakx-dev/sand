import { errorMessage } from '@sand/util'
import katex, { type KatexOptions } from 'katex'
import 'katex/contrib/mhchem'
import type { Typeset } from '../contract'
import { frame } from './frame'
import { preloadMathFonts } from './integrations/fonts'

const OPTIONS: KatexOptions = { strict: 'ignore', trust: false, macros: { '\label': { tokens: [], numArgs: 1 } } }

export const render = (tex: string, displayMode: boolean): Typeset => {
  preloadMathFonts()
  const node = frame(displayMode)
  try {
    katex.render(tex, node, { ...OPTIONS, displayMode, throwOnError: true })
  } catch (error) {
    return { error: errorMessage(error) }
  }
  return node
}

export const renderInto = (node: HTMLElement, tex: string, displayMode: boolean) => {
  preloadMathFonts()
  katex.render(tex, node, { ...OPTIONS, displayMode, throwOnError: false })
}
