import { span } from '@sand/dom'
import type { Line } from './rows'

export type Highlight = (code: string) => (Node | string)[]

const markTone = (line: Line) => (line.kind === 'add' ? 'rounded-sm bg-success-500/30' : 'rounded-sm bg-danger-500/30')

export const codeText = (line: Line, highlight: Highlight) => {
  const { text, marks } = line
  if (!marks?.length) return highlight(text || ' ')
  const parts: (Node | string)[] = []
  let at = 0
  for (const [from, to] of marks) {
    if (from > at) parts.push(...highlight(text.slice(at, from)))
    parts.push(span({ class: markTone(line) }, highlight(text.slice(from, to))))
    at = to
  }
  if (at < text.length) parts.push(...highlight(text.slice(at)))
  return parts
}
