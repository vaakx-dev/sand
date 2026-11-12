import type { Drag, Kit } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'
import type { Swipe, Way } from '../contract'

const edge = 24

const passive = { passive: true }

interface Press {
  x: number
  y: number
  target: EventTarget | null
  way?: Way
  drag?: Drag
}

const installed = () => matchMedia('(display-mode: standalone)').matches

const browserEdge = (x: number) => !installed() && (x < edge || x > document.documentElement.clientWidth - edge)

const blocked = ({ hasOpenLayer, gesture }: Kit, target: EventTarget | null) => hasOpenLayer(true) || gesture.editing(target) || gesture.selecting()

const startDrag = ({ gesture }: Kit, press: Press, way: Way, { clientX, clientY }: Touch, time: number, begin: (way: Way) => Swipe | undefined) => {
  if (gesture.fromSystemEdge(way, press.x, press.y) || gesture.canScrollToward(press.target, way)) return
  const swipe = begin(way)
  return swipe && gesture.follow(swipe, gesture.alongWay(way, clientX, clientY), time)
}

export const swipeGesture = (kit: Kit, begin: (way: Way) => Swipe | undefined) => {
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
      if (event.touches.length !== 1 || !touch || blocked(kit, event.target) || browserEdge(touch.clientX)) return
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
      if (press.drag && press.way) {
        press.drag.move(kit.gesture.alongWay(press.way, touch.clientX, touch.clientY), event.timeStamp)
        return
      }
      const way = kit.gesture.direction(touch.clientX - press.x, touch.clientY - press.y)
      if (way === 'undecided') return
      press.way = way
      press.drag = startDrag(kit, press, way, touch, event.timeStamp, begin)
      if (!press.drag) press = undefined
    },
    passive,
  )

  listen(document, 'touchend', release, passive)
  listen(document, 'touchcancel', release, passive)
}
