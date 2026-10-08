export const escapable = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/

export const matchAt = (pattern: RegExp, source: string, index: number) => {
  pattern.lastIndex = index
  return pattern.exec(source)
}

export const codeSpanAt = (source: string, start: number): { content?: string; end: number } => {
  const opening = /`+/y
  opening.lastIndex = start
  const fence = opening.exec(source)![0]
  const closing = /`+/g
  closing.lastIndex = start + fence.length
  for (let match = closing.exec(source); match; match = closing.exec(source)) {
    if (match[0].length !== fence.length) continue
    const raw = source.slice(start + fence.length, match.index).replace(/\n/g, ' ')
    const padded = raw.length > 2 && raw.startsWith(' ') && raw.endsWith(' ') && raw.trim()
    return { content: padded ? raw.slice(1, -1) : raw, end: match.index + fence.length }
  }
  return { end: start + fence.length }
}

export const closingBracket = (source: string, start: number) => {
  let depth = 0
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (char === '\\') index++
    else if (char === '`') {
      const span = codeSpanAt(source, index)
      index = span.end - 1
    } else if (char === '[') depth++
    else if (char === ']' && --depth === 0) return index
  }
  return -1
}

const skipSpace = (source: string, index: number) => {
  while (index < source.length && /\s/.test(source[index]!)) index++
  return index
}

const bareDestination = (source: string, start: number) => {
  let url = ''
  let depth = 0
  let index = start
  while (index < source.length) {
    const char = source[index]!
    if (char === '\\' && escapable.test(source[index + 1] ?? '')) {
      url += source[index + 1]
      index += 2
      continue
    }
    if (/\s/.test(char)) break
    if (char === '(') depth++
    if (char === ')' && depth-- === 0) break
    url += char
    index++
  }
  return { url, index }
}

export const inlineDestination = (source: string, open: number) => {
  let index = skipSpace(source, open + 1)
  let url: string
  if (source[index] === '<') {
    const end = source.indexOf('>', index)
    if (end < 0 || source.slice(index, end).includes('\n')) return undefined
    url = source.slice(index + 1, end)
    index = end + 1
  } else ({ url, index } = bareDestination(source, index))
  index = skipSpace(source, index)
  let title: string | undefined
  const quote = source[index]
  if (quote === '"' || quote === "'" || quote === '(') {
    const end = source.indexOf(quote === '(' ? ')' : quote, index + 1)
    if (end < 0) return undefined
    title = source.slice(index + 1, end)
    index = skipSpace(source, end + 1)
  }
  if (source[index] !== ')') return undefined
  return { url, title, end: index + 1 }
}
