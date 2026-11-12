import type { Way } from '@sand/ui-shell/contract'

interface Axis {
  overflow: 'overflowX' | 'overflowY'
  position: 'scrollLeft' | 'scrollTop'
  content: 'scrollWidth' | 'scrollHeight'
  visible: 'clientWidth' | 'clientHeight'
}

const AXES: Record<'x' | 'y', Axis> = {
  x: { overflow: 'overflowX', position: 'scrollLeft', content: 'scrollWidth', visible: 'clientWidth' },
  y: { overflow: 'overflowY', position: 'scrollTop', content: 'scrollHeight', visible: 'clientHeight' },
}

const axisOf = (way: Way) => AXES[way === 'left' || way === 'right' ? 'x' : 'y']

const scrolls = (node: Element, axis: Axis) => {
  if (node[axis.content] <= node[axis.visible]) return false
  const overflow = getComputedStyle(node)[axis.overflow]
  if (node === document.scrollingElement) return overflow !== 'hidden' && overflow !== 'clip'
  return overflow === 'auto' || overflow === 'scroll'
}

const towardStart = (way: Way) => way === 'right' || way === 'down'

const hasRoom = (node: Element, axis: Axis, way: Way) =>
  towardStart(way) ? node[axis.position] > 1 : node[axis.position] < node[axis.content] - node[axis.visible] - 1

export const canScrollToward = (target: EventTarget | null, way: Way) => {
  const axis = axisOf(way)
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (scrolls(node, axis) && hasRoom(node, axis, way)) return true
  }
  return false
}
