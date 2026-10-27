import { span } from '@vaakx-dev/vrui'
import katex from 'katex'
import 'katex/contrib/mhchem'
import type { Typeset } from '../contract'

export const typeset = (tex: string, displayMode: boolean): Typeset => {
  const node = span({ class: displayMode && 'mb-3 block overflow-x-auto overflow-y-hidden p-1 last:mb-0' })
  try {
    katex.render(tex, node, { displayMode, throwOnError: true, strict: 'ignore', trust: false, macros: { '\\label': { tokens: [], numArgs: 1 } } })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  return node
}
