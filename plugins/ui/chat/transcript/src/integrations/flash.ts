import { onTimeout } from '@vaakx-dev/vrui'

const HIGHLIGHT = 'chat-flash'
const SHOWN_FOR_MS = 2000

const skipButtons = (node: Node) => (node instanceof HTMLButtonElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)

export const textNodes = (root: Node) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, skipButtons)
  const found: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node instanceof Text) found.push(node)
  return found
}

export const flasher = () => {
  let stop: (() => void) | undefined
  return (ranges: Range[]) => {
    stop?.()
    CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges))
    stop = onTimeout(() => CSS.highlights.delete(HIGHLIGHT), SHOWN_FOR_MS)
  }
}

export type Flash = ReturnType<typeof flasher>
