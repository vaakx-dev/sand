import { textNodes, type Flash } from './flash'

const space = /\s/

interface Flat {
  text: string
  at: [Text, number][]
}

const flatten = (root: Node): Flat => {
  const flat: Flat = { text: '', at: [] }
  for (const node of textNodes(root)) {
    for (let index = 0; index < node.data.length; index++) {
      const char = node.data[index] ?? ''
      if (space.test(char)) continue
      flat.text += char
      flat.at.push([node, index])
    }
  }
  return flat
}

const rangeIn = (root: Element, wanted: string) => {
  const flat = flatten(root)
  const index = flat.text.indexOf(wanted)
  const start = flat.at[index]
  const end = flat.at[index + wanted.length - 1]
  if (index < 0 || !start || !end) return undefined
  const range = document.createRange()
  range.setStart(...start)
  range.setEnd(end[0], end[1] + 1)
  return range
}

const before = (from: Element) => (node: Element) => !node.contains(from) && Boolean(node.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_FOLLOWING)

const findQuote = (root: Element, from: Element, text: string) => {
  const wanted = text.replace(/\s+/g, '')
  if (!wanted) return undefined
  const sources = [...root.querySelectorAll('[data-quote]')].filter(before(from)).reverse()
  for (const source of sources) {
    const range = rangeIn(source, wanted)
    if (range) return range
  }
  return undefined
}

export const quoteJump = (flash: Flash) => (root: Element, from: Element, quote: string) => {
  const range = findQuote(root, from, quote)
  if (!range) return
  range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  flash([range])
}
