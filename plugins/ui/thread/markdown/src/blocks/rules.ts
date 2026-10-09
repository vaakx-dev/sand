export const fence = /^( {0,3})(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/
export const heading = /^ {0,3}(#{1,6})(?=[ \t]|$)[ \t]*(.*?)(?:[ \t]+#+)?[ \t]*$/
export const rule = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
export const quote = /^ {0,3}> ?/
export const setext = /^ {0,3}(=+|-+)[ \t]*$/

export const closingFence = (marker: string) => new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*$`)

export interface ListMarker {
  indent: number
  kind: string
  ordered: boolean
  start: number
  content: number
  text: string
}

const listItem = /^( *)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/

export const listMarker = (line: string): ListMarker | undefined => {
  const match = listItem.exec(line)
  if (!match) return undefined
  const [, lead = '', mark = '', gap = '', rest = ''] = match
  const ordered = /\d/.test(mark)
  const width = !rest || gap.length > 4 ? 1 : gap.length
  const content = lead.length + mark.length + width
  return {
    indent: lead.length,
    kind: ordered ? mark.slice(-1) : mark,
    ordered,
    start: ordered ? parseInt(mark, 10) : 1,
    content,
    text: line.slice(content),
  }
}

export const sameList = (marker: ListMarker | undefined, first: ListMarker) =>
  !!marker && marker.ordered === first.ordered && marker.kind === first.kind

export const indentOf = (line: string) => line.length - line.trimStart().length

export const startsBlock = (line: string) => {
  if (fence.test(line) || heading.test(line) || rule.test(line) || quote.test(line)) return true
  const marker = listMarker(line)
  return !!marker && marker.indent < 4 && !!marker.text.trim() && (!marker.ordered || marker.start === 1)
}
