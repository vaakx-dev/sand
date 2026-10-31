import { span } from '@vaakx-dev/vrui'
import type { DiffLine } from './lcs'

const strong: Partial<Record<DiffLine['kind'], string>> = { add: 'rounded-sm bg-success-500/30', del: 'rounded-sm bg-danger-500/30' }

export const markedText = ({ kind, text, marks = [] }: DiffLine): (Node | string)[] => {
  const look = strong[kind]
  if (!look) return [text || ' ']
  const parts: (Node | string)[] = []
  let at = 0
  for (const { start, end } of marks) {
    if (start > at) parts.push(text.slice(at, start))
    if (end > start) parts.push(span({ class: look }, text.slice(start, end)))
    at = Math.max(at, end)
  }
  if (at < text.length) parts.push(text.slice(at))
  return parts.length ? parts : [' ']
}
