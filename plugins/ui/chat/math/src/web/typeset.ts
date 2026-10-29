import { span } from '@vaakx-dev/vrui'
import katex from 'katex'
import 'katex/contrib/mhchem'
import type { Typeset } from '../contract'
import { preloadMathFonts } from './integrations/fonts'

const kept = 500

const rendered = new Map<string, Typeset>()

const render = (tex: string, displayMode: boolean): Typeset => {
  preloadMathFonts()
  const node = span({ class: displayMode && 'mb-3 block overflow-x-auto overflow-y-hidden p-1 last:mb-0' })
  try {
    katex.render(tex, node, { displayMode, throwOnError: true, strict: 'ignore', trust: false, macros: { '\\label': { tokens: [], numArgs: 1 } } })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  return node
}

const remember = (key: string, result: Typeset) => {
  rendered.delete(key)
  rendered.set(key, result)
  for (const old of rendered.keys()) {
    if (rendered.size <= kept) break
    rendered.delete(old)
  }
}

export const typeset = (tex: string, displayMode: boolean): Typeset => {
  const key = `${displayMode ? 'display' : 'inline'}:${tex}`
  const result = rendered.get(key) ?? render(tex, displayMode)
  remember(key, result)
  return result instanceof Node ? result.cloneNode(true) : result
}
