import type { Markdown, MarkdownImage } from '@sand/markdown/contract'
import { morph } from './morph'

export const streamedMarkdown = (node: Node, markdown: Markdown, image?: MarkdownImage) => {
  let prefix = ''
  let count = 0

  const whole = (source: string) => {
    prefix = ''
    count = 0
    morph(node, markdown.nodes(source, image))
  }

  return (source: string, streaming: boolean) => {
    if (!streaming || !source.startsWith(prefix)) return whole(source)
    const next = markdown.settle(source.slice(prefix.length), image)
    if (!next) return whole(source)
    morph(node, [...next.settled, ...next.open], count)
    count += next.settled.length
    prefix = source.slice(0, prefix.length + next.length)
  }
}
