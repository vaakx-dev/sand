import type { Kit } from '@sand/ui-kit/contract'
import type { MarkdownImage, SettledMarkdown } from './contract'
import { blockSpans } from './blocks'

const unsafe = /\r|^ {0,3}\[[^\]\n]+\]:/m

export const settleMarkdown = (kit: Kit) => (source: string, image?: MarkdownImage): SettledMarkdown | undefined => {
  if (unsafe.test(source)) return undefined
  const raw = source.split('\n')
  const lines = raw.map(line => line.replaceAll('\t', '    '))
  const spans = blockSpans(lines, { kit, refs: new Map(), image })
  const nodes = spans.map(span => span.node)
  const cut = spans.findLastIndex(({ start }, index) => index > 0 && start < lines.length - 1 && !lines[start - 1]!.trim())
  if (cut < 1) return { length: 0, settled: [], open: nodes }
  const length = raw.slice(0, spans[cut]!.start).reduce((sum, line) => sum + line.length + 1, 0)
  return { length, settled: nodes.slice(0, cut), open: nodes.slice(cut) }
}
