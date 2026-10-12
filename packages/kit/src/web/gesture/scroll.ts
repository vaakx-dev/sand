const scrollsSideways = (node: Element) => {
  if (node.scrollWidth <= node.clientWidth) return false
  const { overflowX } = getComputedStyle(node)
  if (node === document.scrollingElement) return overflowX !== 'hidden' && overflowX !== 'clip'
  return overflowX === 'auto' || overflowX === 'scroll'
}

const hasRoom = (node: Element, dx: number) => (dx > 0 ? node.scrollLeft > 1 : node.scrollLeft < node.scrollWidth - node.clientWidth - 1)

export const canScrollToward = (target: EventTarget | null, dx: number) => {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (scrollsSideways(node) && hasRoom(node, dx)) return true
  }
  return false
}
