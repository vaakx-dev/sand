import type { Refs } from '../blocks/refs'
import { inlineMath } from '../math/inline'
import { inlineCode, lineBreak, type Inline } from '../nodes'
import { delimiter, resolveEmphasis, type Item } from './emphasis'
import { decodeEntity } from './entities'
import { autolinkAt, bracketed } from './links'
import { codeSpanAt, escapable, matchAt } from './syntax'

interface Token {
  item: Item
  end: number
}

type Parser = (source: string, index: number, refs: Refs) => Token | undefined

const lineEnd = / *\n */y

const escapedBreak: Parser = (source, index) => (source.startsWith('\\\n', index) ? { item: lineBreak(), end: index + 2 } : undefined)

const escaped: Parser = (source, index) => {
  const next = source[index + 1] ?? ''
  return source[index] === '\\' && escapable.test(next) ? { item: next, end: index + 2 } : undefined
}

const codeSpan: Parser = (source, index) => {
  if (source[index] !== '`') return undefined
  const span = codeSpanAt(source, index)
  return { item: span.content === undefined ? source.slice(index, span.end) : inlineCode(span.content), end: span.end }
}

const emphasisRun: Parser = (source, index) => {
  const char = source[index]!
  if (char !== '*' && char !== '_' && char !== '~') return undefined
  let end = index
  while (source[end] === char) end++
  return { item: delimiter(char, end - index, source[index - 1] ?? '', source[end] ?? ''), end }
}

const bracket: Parser = (source, index, refs) =>
  source[index] === '[' || source.startsWith('![', index) ? bracketed(source, index, refs, inline) : undefined

const autolink: Parser = (source, index) => (source[index] === '<' || source[index] === 'h' ? autolinkAt(source, index) : undefined)

const entity: Parser = (source, index) => {
  if (source[index] !== '&') return undefined
  const decoded = decodeEntity(source.slice(index, index + 40))
  return decoded && { item: decoded.value, end: index + decoded.length }
}

const lineBreakAt: Parser = (source, index) => {
  const found = matchAt(lineEnd, source, index)
  if (!found) return undefined
  return { item: found[0].startsWith('  ') ? lineBreak() : '\n', end: index + found[0].length }
}

const parsers: Parser[] = [inlineMath, escapedBreak, escaped, codeSpan, emphasisRun, bracket, autolink, entity, lineBreakAt]

const tokenAt = (source: string, index: number, refs: Refs): Token => {
  for (const parser of parsers) {
    const token = parser(source, index, refs)
    if (token) return token
  }
  return { item: source[index]!, end: index + 1 }
}

export const inline = (source: string, refs: Refs): Inline[] => {
  const items: Item[] = []
  let pending = ''
  for (let index = 0; index < source.length; ) {
    const { item, end } = tokenAt(source, index, refs)
    index = end
    if (typeof item === 'string') {
      pending += item
      continue
    }
    if (pending) items.push(pending)
    pending = ''
    items.push(item)
  }
  if (pending) items.push(pending)
  return resolveEmphasis(items)
}
