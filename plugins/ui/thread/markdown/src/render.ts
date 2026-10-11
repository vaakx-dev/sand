import { parseBlocks } from './blocks'
import { extractRefs } from './blocks/refs'
import type { MarkdownImage } from './contract'
import { inline } from './inline'

export const markdownNodes = (source: string, image?: MarkdownImage) => {
  const { lines, refs } = extractRefs(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'))
  return parseBlocks(lines, { refs, image })
}

export const markdownInline = (source: string) =>
  source.split('\n').flatMap((line, index) => {
    const nodes = inline(line, { refs: new Map() })
    return index ? ['\n', ...nodes] : nodes
  })
