import { hasOpenLayer, listen, type Swipe } from '@sand/dom'
import { swipeLock } from '@sand/dom/swipe-relay'
import { follow, type Drag } from '../follow'

const edge = 24

interface Press {
  id: number
  x: number
  y: number
  target: EventTarget | null
  drag?: Drag
}

const typing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null

const scrollsSideways = (node: Element) => {
  if (node.scrollWidth <= node.clientWidth) return false
  const { overflowX } = getComputedStyle(node)
  return overflowX === 'auto' || overflowX === 'scroll'
}

const canScroll = (node: Element, dx: number) => (dx > 0 ? node.scrollLeft > 1 : node.scrollLeft < node.scrollWidth - node.clientWidth - 1)

const scrollsToward = (target: EventTarget | null, dx: number) => {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (scrollsSideways(node) && canScroll(node, dx)) return true
  }
  return false
}

const selecting = () => getSelection()?.isCollapsed === false

const atEdge = (x: number) => x < edge || x > document.documentElement.clientWidth - edge

const blocked = (target: EventTarget | null) => hasOpenLayer(true) || typing(target) || selecting()

const direction = (press: Press, { clientX, clientY }: PointerEvent) => {
  const dx = Math.abs(clientX - press.x)
  const dy = Math.abs(clientY - press.y)
  if (dy > swipeLock && dy > dx) return 'vertical'
  if (dx < swipeLock) return 'undecided'
  return 'sideways'
}

const startDrag = (press: Press, event: PointerEvent, begin: () => Swipe | undefined) => {
  if (scrollsToward(press.target, event.clientX - press.x)) return
  const swipe = begin()
  return swipe && follow(swipe, event.clientX, event.timeStamp)
}

export const swipeGesture = (begin: () => Swipe | undefined) => {
  let press: Press | undefined

  listen(document, 'pointerdown', ({ pointerType, isPrimary, pointerId, clientX, clientY, target }: PointerEvent) => {
    if (pointerType !== 'touch' || !isPrimary || blocked(target) || atEdge(clientX)) return
    press = { id: pointerId, x: clientX, y: clientY, target }
  })

  listen(document, 'pointermove', (event: PointerEvent) => {
    if (press?.id !== event.pointerId) return
    if (press.drag) return press.drag.move(event.clientX, event.timeStamp)
    const way = direction(press, event)
    if (way === 'undecided') return
    press.drag = way === 'sideways' ? startDrag(press, event, begin) : undefined
    if (!press.drag) press = undefined
  })

  listen(
    document,
    'touchmove',
    event => {
      if (press?.drag && event.cancelable) event.preventDefault()
    },
    { passive: false },
  )

  const release = ({ pointerId, timeStamp }: PointerEvent) => {
    if (press?.id !== pointerId) return
    press.drag?.end(timeStamp)
    press = undefined
  }
  listen(document, 'pointerup', release)
  listen(document, 'pointercancel', release)
}
