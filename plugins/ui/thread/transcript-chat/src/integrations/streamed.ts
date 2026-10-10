import type { Markdown } from '@sand/markdown/contract'
import { morph } from './morph'

export const streamedMarkdown = (node: Node, markdown: Markdown) => {
  let prefix = ''
  let count = 0

  const whole = (source: string) => {
    prefix = ''
    count = 0
    morph(node, markdown.nodes(source))
  }

  return (source: string, streaming: boolean) => {
    if (!streaming || !source.startsWith(prefix)) return whole(source)
    const next = markdown.settle(source.slice(prefix.length))
    if (!next) return whole(source)
    morph(node, [...next.settled, ...next.open], count)
    count += next.settled.length
    prefix = source.slice(0, prefix.length + next.length)
  }
}
