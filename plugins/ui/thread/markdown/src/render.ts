import { parseBlocks } from './blocks'
import { extractRefs } from './blocks/refs'
import { inline } from './inline'

export const markdownNodes = (source: string) => {
  const { lines, refs } = extractRefs(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'))
  return parseBlocks(lines, refs)
}

export const markdownInline = (source: string) =>
  source.split('\n').flatMap((line, index) => {
    const nodes = inline(line, new Map())
    return index ? ['\n', ...nodes] : nodes
  })
