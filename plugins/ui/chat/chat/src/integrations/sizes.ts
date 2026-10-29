import { resizeObserver } from '@vaakx-dev/vrui'
import { nativeAnchoring, shiftBy, stickToEnd } from './scroll'

const heightOf = (entry: ResizeObserverEntry) => entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height

export const rowSizes = (scroller: HTMLElement, pinned: () => boolean) => {
  const heights = new WeakMap<Element, number>()

  const shiftAbove = (entries: ResizeObserverEntry[]) => {
    const top = scroller.getBoundingClientRect().top
    let shift = 0
    for (const entry of entries) {
      const height = heightOf(entry)
      if (!height) continue
      const before = heights.get(entry.target)
      heights.set(entry.target, height)
      if (before === undefined || entry.target === scroller) continue
      const grown = height - before
      if (entry.target.getBoundingClientRect().bottom - grown <= top) shift += grown
    }
    return shift
  }

  const resized = (entries: ResizeObserverEntry[]) => {
    const shift = nativeAnchoring ? 0 : shiftAbove(entries)
    if (pinned()) stickToEnd(scroller)
    else shiftBy(scroller, shift)
  }

  const observer = resizeObserver(scroller, resized)
  return (node: Element) => {
    observer.observe(node)
    return () => observer.unobserve(node)
  }
}
