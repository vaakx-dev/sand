import type { Refs } from '../blocks/refs'
import { inlineCode, lineBreak, text } from '../nodes'
import { delimiter, resolveEmphasis, type Item } from './emphasis'
import { decodeEntity } from './entities'
import { autolinkAt, bracketed } from './links'
import { codeSpanAt, escapable, matchAt } from './syntax'

type Token = { node: Item; end: number } | { text: string; end: number }

type Parser = (source: string, index: number, refs: Refs) => Token | undefined

const lineEnd = / *\n */y

const escapedBreak: Parser = (source, index) => (source.startsWith('\\\n', index) ? { node: lineBreak(), end: index + 2 } : undefined)

const escaped: Parser = (source, index) => {
  const next = source[index + 1] ?? ''
  return source[index] === '\\' && escapable.test(next) ? { text: next, end: index + 2 } : undefined
}

const codeSpan: Parser = (source, index) => {
  if (source[index] !== '`') return undefined
  const span = codeSpanAt(source, index)
  return span.content === undefined ? { text: source.slice(index, span.end), end: span.end } : { node: inlineCode(span.content), end: span.end }
}

const emphasisRun: Parser = (source, index) => {
  const char = source[index]!
  if (char !== '*' && char !== '_' && char !== '~') return undefined
  let end = index
  while (source[end] === char) end++
  return { node: delimiter(char, end - index, source[index - 1] ?? '', source[end] ?? ''), end }
}

const bracket: Parser = (source, index, refs) =>
  source[index] === '[' || source.startsWith('![', index) ? bracketed(source, index, refs, inline) : undefined

const autolink: Parser = (source, index) => (source[index] === '<' || source[index] === 'h' ? autolinkAt(source, index) : undefined)

const entity: Parser = (source, index) => {
  if (source[index] !== '&') return undefined
  const decoded = decodeEntity(source.slice(index, index + 40))
  return decoded && { text: decoded.value, end: index + decoded.length }
}

const lineBreakAt: Parser = (source, index) => {
  const found = matchAt(lineEnd, source, index)
  if (!found) return undefined
  const end = index + found[0].length
  return found[0].startsWith('  ') ? { node: lineBreak(), end } : { text: '\n', end }
}

const parsers: Parser[] = [escapedBreak, escaped, codeSpan, emphasisRun, bracket, autolink, entity, lineBreakAt]

const tokenAt = (source: string, index: number, refs: Refs): Token => {
  for (const parser of parsers) {
    const token = parser(source, index, refs)
    if (token) return token
  }
  return { text: source[index]!, end: index + 1 }
}

export const inline = (source: string, refs: Refs): Node[] => {
  const items: Item[] = []
  let pending = ''
  for (let index = 0; index < source.length; ) {
    const token = tokenAt(source, index, refs)
    index = token.end
    if ('text' in token) {
      pending += token.text
      continue
    }
    if (pending) items.push(text(pending))
    pending = ''
    items.push(token.node)
  }
  if (pending) items.push(text(pending))
  return resolveEmphasis(items)
}
