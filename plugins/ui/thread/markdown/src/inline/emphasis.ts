import { emphasis, type Emphasis, type Inline } from '../nodes'

export interface Delimiter {
  char: string
  length: number
  count: number
  open: boolean
  close: boolean
}

export type Item = Inline | Delimiter

interface Placed {
  delimiter: Delimiter
  index: number
}

const isDelimiter = (item: Item): item is Delimiter => typeof item !== 'string' && !(item instanceof Node)

const isSpace = (char: string) => !char || /\s/.test(char)

const isPunctuation = (char: string) => /[\p{P}\p{S}]/u.test(char)

export const delimiter = (char: string, length: number, before: string, after: string): Delimiter => {
  const left = !isSpace(after) && (!isPunctuation(after) || isSpace(before) || isPunctuation(before))
  const right = !isSpace(before) && (!isPunctuation(before) || isSpace(after) || isPunctuation(after))
  const underscore = char === '_'
  return {
    char,
    length,
    count: length,
    open: underscore ? left && (!right || isPunctuation(before)) : left,
    close: underscore ? right && (!left || isPunctuation(after)) : right,
  }
}

const matches = (opener: Delimiter, closer: Delimiter) => {
  if (!opener.open || !opener.count || opener.char !== closer.char) return false
  if (closer.char === '~') return opener.count === closer.count && opener.count <= 2
  const ambiguous = opener.close || closer.open
  return !(ambiguous && (opener.length + closer.length) % 3 === 0 && (opener.length % 3 || closer.length % 3))
}

const toInline = (items: Item[]) =>
  items.flatMap(item => {
    if (!isDelimiter(item)) return [item]
    return item.count ? [item.char.repeat(item.count)] : []
  })

const kindOf = (char: string, use: number): Emphasis => {
  if (char === '~') return 'del'
  return use === 2 ? 'strong' : 'em'
}

const findOpener = (items: Item[], closer: Placed): Placed | undefined => {
  for (let index = closer.index - 1; index >= 0; index--) {
    const item = items[index]!
    if (isDelimiter(item) && matches(item, closer.delimiter)) return { delimiter: item, index }
  }
  return undefined
}

const wrap = (items: Item[], opener: Placed, closer: Placed) => {
  const use = closer.delimiter.char === '~' ? closer.delimiter.count : Math.min(2, opener.delimiter.count, closer.delimiter.count)
  const node = emphasis(kindOf(closer.delimiter.char, use), toInline(items.slice(opener.index + 1, closer.index)))
  opener.delimiter.count -= use
  closer.delimiter.count -= use
  items.splice(opener.index + 1, closer.index - opener.index - 1, node)
  return opener.index + 2
}

export const resolveEmphasis = (items: Item[]) => {
  for (let index = 0; index < items.length; index++) {
    const delimiter = items[index]!
    if (!isDelimiter(delimiter) || !delimiter.close) continue
    while (delimiter.count > 0) {
      const opener = findOpener(items, { delimiter, index })
      if (!opener) break
      index = wrap(items, opener, { delimiter, index })
    }
  }
  return toInline(items)
}
