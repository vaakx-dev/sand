import { quoteBlocks } from '@sand/util'
import type { Message } from './message'
import { linkLabels, promptText } from './prompt'

export interface SearchableBlock {
  block: number
  text: string
}

const FENCE = /^\s{0,3}(```|~~~)/
const HIDDEN_LINES = [/^\s{0,3}([-*_])(\s*\1){2,}\s*$/, /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/, /^\s{0,3}\[[^\]]+\]:\s+\S+/]
const LINE_MARKERS = /^\s*(?:>\s?)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)?/
const CODE_SPANS = /(`+)(.+?)\1/g
const INLINE_MARKS: [RegExp, string][] = [
  [/!?\[([^\]]*)\]\([^)]*\)/g, '$1'],
  [/\[([^\]]*)\]\[[^\]]*\]/g, '$1'],
  [/<((?:https?|mailto):[^>\s]+)>/g, '$1'],
  [/(\*{1,3}|~~)(?=\S)(.+?)(?<=\S)\1/g, '$2'],
  [/(?<![\p{L}\p{N}_])(_{1,3})(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}_])/gu, '$2'],
  [/\\([\\`*_{}[\]()#+\-.!|~>])/g, '$1'],
]

const unmarked = (text: string) => INLINE_MARKS.reduce((plain, [mark, kept]) => plain.replace(mark, kept), text)

const withoutCodeMarks = (line: string) => {
  let plain = ''
  let from = 0
  for (const span of line.matchAll(CODE_SPANS)) {
    plain += unmarked(line.slice(from, span.index)) + span[2]
    from = span.index + span[0].length
  }
  return plain + unmarked(line.slice(from))
}

const tableCells = (line: string) =>
  line.trimStart().startsWith('|')
    ? line
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean)
        .join(' ')
    : line

const plainLine = (line: string) => (HIDDEN_LINES.some(hidden => hidden.test(line)) ? '' : withoutCodeMarks(tableCells(line.replace(LINE_MARKERS, ''))))

const plainText = (markdown: string) => {
  let fenced = false
  return markdown
    .split('\n')
    .map(line => {
      if (FENCE.test(line)) {
        fenced = !fenced
        return ''
      }
      return fenced ? line : plainLine(line)
    })
    .join('\n')
    .trim()
}

const userText = (message: Message) =>
  quoteBlocks(promptText(message))
    .map(({ text }) => linkLabels(text))
    .join('\n')
    .trim()

const searchableText = (message: Message): SearchableBlock[] => {
  if (message.role === 'user') return [{ block: 0, text: userText(message) }].filter(({ text }) => text)
  return message.content.flatMap((block, index) => (block.type === 'text' ? [{ block: index, text: plainText(block.text) }] : [])).filter(({ text }) => text)
}

export { plainText, searchableText }
