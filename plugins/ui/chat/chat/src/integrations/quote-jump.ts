import { onTimeout } from '@vaakx-dev/vrui'

const highlight = 'chat-quote'
const shownFor = 2000
const space = /\s/

interface Flat {
  text: string
  at: [Text, number][]
}

const skipQuotes = (node: Node) => (node instanceof HTMLButtonElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)

const flatten = (root: Node): Flat => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, skipQuotes)
  const flat: Flat = { text: '', at: [] }
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node instanceof Text)) continue
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

export const findQuote = (root: Element, from: Element, text: string) => {
  const wanted = text.replace(/\s+/g, '')
  if (!wanted) return undefined
  const sources = [...root.querySelectorAll('[data-quote]')].filter(before(from)).reverse()
  for (const source of sources) {
    const range = rangeIn(source, wanted)
    if (range) return range
  }
  return undefined
}

export const quoteFlash = (owner: Node) => {
  let stop: (() => void) | undefined
  return (range: Range) => {
    stop?.()
    range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    CSS.highlights.set(highlight, new Highlight(range))
    stop = onTimeout(() => CSS.highlights.delete(highlight), shownFor, owner)
  }
}
