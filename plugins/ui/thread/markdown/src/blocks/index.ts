import { codeBlock } from '../code/block'
import { inline } from '../inline'
import { displayMath, mathBlock } from '../math/block'
import { blockquote, heading, paragraph, thematicBreak } from '../nodes'
import type { Scope } from '../scope'
import { parseList } from './list'
import { closingFence, fence, heading as atx, indentOf, listMarker, quote, rule, setext, startsBlock } from './rules'
import { isTableStart, parseTable } from './table'

interface Block {
  node: Node
  next: number
}

type Parser = (lines: string[], start: number, scope: Scope) => Block | undefined

const titled = (level: number, content: string, scope: Scope) => heading(level, inline(content, scope))

const fenced: Parser = (lines, start) => {
  const open = fence.exec(lines[start]!)
  if (!open) return undefined
  const [, indent = '', marker = ''] = open
  const closing = closingFence(marker)
  const body: string[] = []
  let index = start + 1
  while (index < lines.length && !closing.test(lines[index]!)) {
    const line = lines[index++]!
    body.push(line.slice(Math.min(indent.length, indentOf(line))))
  }
  const code = body.join('\n')
  const language = open[3] ?? ''
  return { node: language === 'math' ? displayMath(code) : codeBlock(code, language), next: index + 1 }
}

const atxHeading: Parser = (lines, start, scope) => {
  const match = atx.exec(lines[start]!)
  return match ? { node: titled(match[1]!.length, match[2] ?? '', scope), next: start + 1 } : undefined
}

const ruled: Parser = (lines, start) => (rule.test(lines[start]!) ? { node: thematicBreak(), next: start + 1 } : undefined)

const table: Parser = (lines, start, scope) => (isTableStart(lines, start) ? parseTable(lines, start, scope) : undefined)

const list: Parser = (lines, start, scope) => {
  const marker = listMarker(lines[start]!)
  return marker && marker.indent < 4 ? parseList(lines, start, scope, parseBlocks) : undefined
}

const quoted: Parser = (lines, start, scope) => {
  if (!quote.test(lines[start]!)) return undefined
  const body: string[] = []
  let index = start
  while (index < lines.length) {
    const line = lines[index]!
    if (quote.test(line)) body.push(line.replace(quote, ''))
    else if (line.trim() && body.at(-1)?.trim() && !startsBlock(line)) body.push(line)
    else break
    index++
  }
  return { node: blockquote(parseBlocks(body, scope)), next: index }
}

const indentedCode: Parser = (lines, start) => {
  if (indentOf(lines[start]!) < 4) return undefined
  const body: string[] = []
  let index = start
  while (index < lines.length && (!lines[index]!.trim() || indentOf(lines[index]!) >= 4)) body.push(lines[index++]!.slice(4))
  while (body.at(-1) === '') body.pop()
  return { node: codeBlock(body.join('\n'), ''), next: index }
}

const plain: Parser = (lines, start, scope) => {
  const body = [lines[start]!.trimStart()]
  let index = start + 1
  while (index < lines.length) {
    const line = lines[index]!
    if (!line.trim()) break
    const underline = setext.exec(line)
    if (underline) return { node: titled(underline[1]!.startsWith('=') ? 1 : 2, body.join('\n').trim(), scope), next: index + 1 }
    if (startsBlock(line) || isTableStart(lines, index)) break
    body.push(line.trimStart())
    index++
  }
  return { node: paragraph(inline(body.join('\n').trimEnd(), scope)), next: index }
}

const parsers: Parser[] = [fenced, mathBlock, atxHeading, ruled, table, list, quoted, indentedCode, plain]

export interface Span {
  node: Node
  start: number
}

export const blockSpans = (lines: string[], scope: Scope): Span[] => {
  const spans: Span[] = []
  let index = 0
  while (index < lines.length) {
    if (!lines[index]!.trim()) {
      index++
      continue
    }
    for (const parser of parsers) {
      const block = parser(lines, index, scope)
      if (!block) continue
      spans.push({ node: block.node, start: index })
      index = block.next
      break
    }
  }
  return spans
}

export const parseBlocks = (lines: string[], scope: Scope): Node[] => blockSpans(lines, scope).map(span => span.node)
