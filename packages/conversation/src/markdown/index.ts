import { parseBlocks } from './blocks'
import { extractRefs } from './blocks/refs'
import { inline } from './inline'
import { text } from './nodes'

export { highlight } from './code/highlight'
export { markdownCss } from './style'

export const markdownNodes = (source: string) => {
  const { lines, refs } = extractRefs(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'))
  return parseBlocks(lines, refs)
}

export const markdownInline = (source: string) =>
  source.split('\n').flatMap((line, index) => (index ? [text('\n'), ...inline(line, new Map())] : inline(line, new Map())))
