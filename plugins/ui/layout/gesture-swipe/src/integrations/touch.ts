import { hasOpenLayer, listen, type Swipe } from '@sand/dom'

const lockDistance = 10
const idleMs = 80
const edge = 24

interface Touch {
  id: number
  x: number
  y: number
  last: number
  time: number
  speed: number
  swipe?: Swipe
}

const typing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null

const scrollsSideways = (target: EventTarget | null) => {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (node.scrollWidth <= node.clientWidth) continue
    const { overflowX } = getComputedStyle(node)
    if (overflowX === 'auto' || overflowX === 'scroll') return true
  }
  return false
}

const selecting = () => getSelection()?.isCollapsed === false

const atEdge = (x: number) => x < edge || x > document.documentElement.clientWidth - edge

const blocked = (target: EventTarget | null) => hasOpenLayer(true) || typing(target) || selecting() || scrollsSideways(target)

const direction = (touch: Touch, { clientX, clientY }: PointerEvent) => {
  const dx = Math.abs(clientX - touch.x)
  const dy = Math.abs(clientY - touch.y)
  if (dy > lockDistance && dy > dx) return 'vertical'
  if (dx < lockDistance) return 'undecided'
  return 'sideways'
}

export const swipeGesture = (begin: () => Swipe | undefined) => {
  let touch: Touch | undefined

  listen(document, 'pointerdown', ({ pointerType, isPrimary, pointerId, clientX, clientY, timeStamp, target }: PointerEvent) => {
    if (pointerType !== 'touch' || !isPrimary || blocked(target) || atEdge(clientX)) return
    touch = { id: pointerId, x: clientX, y: clientY, last: clientX, time: timeStamp, speed: 0 }
  })

  listen(document, 'pointermove', (event: PointerEvent) => {
    if (!touch || touch.id !== event.pointerId) return
    const { clientX, timeStamp } = event
    if (!touch.swipe) {
      const way = direction(touch, event)
      if (way === 'undecided') return
      touch.swipe = way === 'sideways' ? begin() : undefined
      if (!touch.swipe) {
        touch = undefined
        return
      }
      touch.x = clientX
      touch.last = clientX
      touch.time = timeStamp
    }
    const elapsed = Math.max(timeStamp - touch.time, 1)
    touch.speed = 0.8 * touch.speed + (0.2 * (clientX - touch.last)) / elapsed
    touch.last = clientX
    touch.time = timeStamp
    touch.swipe.move(clientX - touch.x)
  })

  listen(
    document,
    'touchmove',
    event => {
      if (touch?.swipe && event.cancelable) event.preventDefault()
    },
    { passive: false },
  )

  const release = ({ pointerId, timeStamp }: PointerEvent) => {
    if (touch?.id !== pointerId) return
    if (touch.swipe) touch.swipe.end(timeStamp - touch.time > idleMs ? 0 : touch.speed)
    touch = undefined
  }
  listen(document, 'pointerup', release)
  listen(document, 'pointercancel', release)
}
