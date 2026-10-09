import { emphasis, text, type Emphasis } from '../nodes'

export interface Delimiter {
  char: string
  length: number
  count: number
  open: boolean
  close: boolean
  node: Text
}

export type Item = Node | Delimiter

const isDelimiter = (item: Item): item is Delimiter => !(item instanceof Node)

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
    node: text(char.repeat(length)),
  }
}

const matches = (opener: Delimiter, closer: Delimiter) => {
  if (!opener.open || !opener.count || opener.char !== closer.char) return false
  if (closer.char === '~') return opener.count === closer.count && opener.count <= 2
  const ambiguous = opener.close || closer.open
  return !(ambiguous && (opener.length + closer.length) % 3 === 0 && (opener.length % 3 || closer.length % 3))
}

const toNodes = (items: Item[]) =>
  items.flatMap(item => (isDelimiter(item) ? (item.node.data ? [item.node] : []) : [item]))

const kindOf = (char: string, use: number): Emphasis => {
  if (char === '~') return 'del'
  return use === 2 ? 'strong' : 'em'
}

const wrap = (items: Item[], openerIndex: number, closerIndex: number) => {
  const opener = items[openerIndex] as Delimiter
  const closer = items[closerIndex] as Delimiter
  const use = closer.char === '~' ? closer.count : Math.min(2, opener.count, closer.count)
  const node = emphasis(kindOf(closer.char, use), toNodes(items.slice(openerIndex + 1, closerIndex)))
  opener.count -= use
  closer.count -= use
  opener.node.data = opener.char.repeat(opener.count)
  closer.node.data = closer.char.repeat(closer.count)
  items.splice(openerIndex + 1, closerIndex - openerIndex - 1, node)
  return openerIndex + 2
}

export const resolveEmphasis = (items: Item[]) => {
  for (let closerIndex = 0; closerIndex < items.length; closerIndex++) {
    const closer = items[closerIndex]!
    if (!isDelimiter(closer) || !closer.close) continue
    while (closer.count > 0) {
      let openerIndex = closerIndex - 1
      while (openerIndex >= 0) {
        const candidate = items[openerIndex]!
        if (isDelimiter(candidate) && matches(candidate, closer)) break
        openerIndex--
      }
      if (openerIndex < 0) break
      closerIndex = wrap(items, openerIndex, closerIndex)
    }
  }
  return toNodes(items)
}
