export interface QuoteBlock {
  kind: 'text' | 'quote'
  text: string
}

const marker = /^> ?/
const fence = /^\s*(```|~~~)/

const lineKinds = (lines: string[]) => {
  let fenced = false
  return lines.map(line => {
    if (fence.test(line)) fenced = !fenced
    return !fenced && marker.test(line) ? 'quote' : 'text'
  })
}

const trimBlank = (text: string) => text.replace(/^\s*\n|\n\s*$/g, '')

export const quoteBlocks = (text: string): QuoteBlock[] => {
  const lines = text.split('\n')
  const kinds = lineKinds(lines)
  if (!kinds.includes('quote')) return [{ kind: 'text', text }]
  const blocks: QuoteBlock[] = []
  lines.forEach((line, index) => {
    const kind = kinds[index] ?? 'text'
    const value = kind === 'quote' ? line.replace(marker, '') : line
    const last = blocks.at(-1)
    if (last?.kind === kind) last.text += `\n${value}`
    else blocks.push({ kind, text: value })
  })
  return blocks.map(block => (block.kind === 'text' ? { ...block, text: trimBlank(block.text) } : block))
}

const quoted = (text: string) =>
  text
    .split('\n')
    .map(line => (line ? `> ${line}` : '>'))
    .join('\n')

export const quotedText = (blocks: QuoteBlock[]) =>
  blocks
    .map(block => (block.kind === 'quote' ? quoted(block.text.trim()) : block.text.trim()))
    .filter(Boolean)
    .join('\n\n')
