import type { Swipe } from '@sand/layout/contract'
import type { Drag, Kit } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'

const edge = 24

const passive = { passive: true }

interface Press {
  x: number
  y: number
  target: EventTarget | null
  drag?: Drag
}

const atEdge = (x: number) => x < edge || x > document.documentElement.clientWidth - edge

const blocked = ({ hasOpenLayer, gesture }: Kit, target: EventTarget | null) => hasOpenLayer(true) || gesture.editing(target) || gesture.selecting()

const startDrag = ({ gesture }: Kit, press: Press, { clientX }: Touch, time: number, begin: () => Swipe | undefined) => {
  if (gesture.canScrollToward(press.target, clientX - press.x)) return
  const swipe = begin()
  return swipe && gesture.follow(swipe, clientX, time)
}

export const swipeGesture = (kit: Kit, begin: () => Swipe | undefined) => {
  let press: Press | undefined

  const release = ({ timeStamp }: TouchEvent) => {
    press?.drag?.end(timeStamp)
    press = undefined
  }

  listen(
    document,
    'touchstart',
    (event: TouchEvent) => {
      release(event)
      const [touch] = event.touches
      if (event.touches.length !== 1 || !touch || blocked(kit, event.target) || atEdge(touch.clientX)) return
      press = { x: touch.clientX, y: touch.clientY, target: event.target }
    },
    passive,
  )

  listen(
    document,
    'touchmove',
    (event: TouchEvent) => {
      const [touch] = event.touches
      if (!press || !touch) return
      if (press.drag) {
        press.drag.move(touch.clientX, event.timeStamp)
        return
      }
      const way = kit.gesture.direction(touch.clientX - press.x, touch.clientY - press.y)
      if (way === 'undecided') return
      press.drag = way === 'sideways' ? startDrag(kit, press, touch, event.timeStamp, begin) : undefined
      if (!press.drag) press = undefined
    },
    passive,
  )

  listen(document, 'touchend', release, passive)
  listen(document, 'touchcancel', release, passive)
}
