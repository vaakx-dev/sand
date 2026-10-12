import type { Kit } from '@sand/ui-kit/contract'
import { parseBlocks } from './blocks'
import { extractRefs } from './blocks/refs'
import type { MarkdownImage } from './contract'
import { inline } from './inline'

export const markdownNodes = (kit: Kit) => (source: string, image?: MarkdownImage) => {
  const { lines, refs } = extractRefs(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'))
  return parseBlocks(lines, { kit, refs, image })
}

export const markdownInline = (kit: Kit) => (source: string) =>
  source.split('\n').flatMap((line, index) => {
    const nodes = inline(line, { kit, refs: new Map() })
    return index ? ['\n', ...nodes] : nodes
  })
