import { codeBlock } from '../code/block'
import { inline } from '../inline'
import { blockquote, heading, paragraph, thematicBreak } from '../nodes'
import { parseList } from './list'
import type { Refs } from './refs'
import { closingFence, fence, heading as atx, indentOf, listMarker, quote, rule, setext, startsBlock } from './rules'
import { isTableStart, parseTable } from './table'

interface Block {
  node: Node
  next: number
}

type Parser = (lines: string[], start: number, refs: Refs) => Block | undefined

const titled = (level: number, content: string, refs: Refs) => heading(level, inline(content, refs))

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
  return { node: codeBlock(body.join('\n'), open[3] ?? ''), next: index + 1 }
}

const atxHeading: Parser = (lines, start, refs) => {
  const match = atx.exec(lines[start]!)
  return match ? { node: titled(match[1]!.length, match[2] ?? '', refs), next: start + 1 } : undefined
}

const ruled: Parser = (lines, start) => (rule.test(lines[start]!) ? { node: thematicBreak(), next: start + 1 } : undefined)

const table: Parser = (lines, start, refs) => (isTableStart(lines, start) ? parseTable(lines, start, refs) : undefined)

const list: Parser = (lines, start, refs) => {
  const marker = listMarker(lines[start]!)
  return marker && marker.indent < 4 ? parseList(lines, start, refs, parseBlocks) : undefined
}

const quoted: Parser = (lines, start, refs) => {
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
  return { node: blockquote(parseBlocks(body, refs)), next: index }
}

const indentedCode: Parser = (lines, start) => {
  if (indentOf(lines[start]!) < 4) return undefined
  const body: string[] = []
  let index = start
  while (index < lines.length && (!lines[index]!.trim() || indentOf(lines[index]!) >= 4)) body.push(lines[index++]!.slice(4))
  while (body.at(-1) === '') body.pop()
  return { node: codeBlock(body.join('\n'), ''), next: index }
}

const plain: Parser = (lines, start, refs) => {
  const body = [lines[start]!.trimStart()]
  let index = start + 1
  while (index < lines.length) {
    const line = lines[index]!
    if (!line.trim()) break
    const underline = setext.exec(line)
    if (underline) return { node: titled(underline[1]!.startsWith('=') ? 1 : 2, body.join('\n').trim(), refs), next: index + 1 }
    if (startsBlock(line) || isTableStart(lines, index)) break
    body.push(line.trimStart())
    index++
  }
  return { node: paragraph(inline(body.join('\n').trimEnd(), refs)), next: index }
}

const parsers: Parser[] = [fenced, atxHeading, ruled, table, list, quoted, indentedCode, plain]

export interface Span {
  node: Node
  start: number
}

export const blockSpans = (lines: string[], refs: Refs): Span[] => {
  const spans: Span[] = []
  let index = 0
  while (index < lines.length) {
    if (!lines[index]!.trim()) {
      index++
      continue
    }
    for (const parser of parsers) {
      const block = parser(lines, index, refs)
      if (!block) continue
      spans.push({ node: block.node, start: index })
      index = block.next
      break
    }
  }
  return spans
}

export const parseBlocks = (lines: string[], refs: Refs): Node[] => blockSpans(lines, refs).map(span => span.node)
