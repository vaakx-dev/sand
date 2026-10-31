import type { Child } from '@vaakx-dev/vrui'
import { metaLine } from '../heads/text'

const reasons = new WeakSet<Node>()

export const menuReason = (text: Child) => {
  const line = metaLine(text)
  reasons.add(line)
  return line
}

export const hasReason = (children: Child[]) => children.some(child => child instanceof Node && reasons.has(child))
