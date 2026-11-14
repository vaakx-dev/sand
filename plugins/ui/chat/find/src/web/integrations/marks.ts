import { textMatches } from '@sand/util'

const MATCHES = 'chat-find'
const CURRENT = 'chat-find-current'
const SHOWN_TEXT = '[data-quote]:not([data-quote] [data-quote])'

const textNodes = (root: Node) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const found: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node instanceof Text) found.push(node)
  return found
}

const startNode = (starts: number[], offset: number) => starts.findLastIndex(start => start <= offset)

const endNode = (starts: number[], offset: number) => starts.findLastIndex(start => start < offset)

const rangesInText = (root: Element, query: string) => {
  const nodes = textNodes(root)
  const starts: number[] = []
  let text = ''
  for (const node of nodes) {
    starts.push(text.length)
    text += node.data
  }
  return textMatches(text, query).map(([start, end]) => {
    const first = startNode(starts, start)
    const last = endNode(starts, end)
    const range = document.createRange()
    range.setStart(nodes[first]!, start - starts[first]!)
    range.setEnd(nodes[last]!, end - starts[last]!)
    return range
  })
}

const shownText = (row: Element) => {
  const parts = [...row.querySelectorAll(SHOWN_TEXT)]
  return parts.length ? parts : [row]
}

const rangesIn = (row: Element, query: string) => shownText(row).flatMap(part => rangesInText(part, query))

const drawnRows = (root: Element) => new Map([...root.querySelectorAll<HTMLElement>('[data-item]')].map(row => [row.dataset.item ?? '', row]))

const paint = (all: Range[], current: Range | undefined) => {
  CSS.highlights.set(MATCHES, new Highlight(...all.filter(range => range !== current)))
  if (current) CSS.highlights.set(CURRENT, new Highlight(current))
  else CSS.highlights.delete(CURRENT)
}

const unpaint = () => {
  CSS.highlights.delete(MATCHES)
  CSS.highlights.delete(CURRENT)
}

const bringIntoView = (scroller: HTMLElement, target: Range, coveredPx: number) => {
  const box = scroller.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  const top = box.top + coveredPx
  if (rect.top >= top && rect.bottom <= box.bottom) return
  scroller.scrollTop += rect.top + rect.height / 2 - (top + box.bottom) / 2
}

export { bringIntoView, drawnRows, paint, rangesIn, unpaint }
