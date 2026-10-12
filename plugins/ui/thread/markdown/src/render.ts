import { parseBlocks } from './blocks'
import { extractRefs } from './blocks/refs'
import type { MarkdownImage } from './contract'
import { inline } from './inline'
import type { Renderers } from './scope'

export const markdownNodes = (renderers: Renderers) => (source: string, image?: MarkdownImage) => {
  const { lines, refs } = extractRefs(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'))
  return parseBlocks(lines, { ...renderers, refs, image })
}

export const markdownInline = (renderers: Renderers) => (source: string) =>
  source.split('\n').flatMap((line, index) => {
    const nodes = inline(line, { ...renderers, refs: new Map() })
    return index ? ['\n', ...nodes] : nodes
  })
