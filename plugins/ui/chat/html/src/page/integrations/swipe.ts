import type { Swipe, Way } from '@sand/ui-shell/contract'
import { alongWay, canScrollToward, direction, type Drag, editing, follow, fromSystemEdge, selecting } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'
import { swipeEnd, swipeMove, swipeStart } from '../protocol'
import { post } from './post'

interface Press {
  x: number
  y: number
  target: EventTarget | null
  way?: Way
  drag?: Drag
}

const host: Swipe = {
  move: delta => post(swipeMove, { delta }),
  end: velocity => post(swipeEnd, { velocity }),
}

const PANS: Record<Way, RegExp> = { left: /auto|manipulation|pan-x/, right: /auto|manipulation|pan-x/, up: /auto|manipulation|pan-y/, down: /auto|manipulation|pan-y/ }

const pans = (target: EventTarget | null, way: Way) => {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (!PANS[way].test(getComputedStyle(node).touchAction)) return false
  }
  return true
}

const pageKeeps = (event: TouchEvent, { target, x, y }: Press, way: Way) =>
  event.defaultPrevented || editing(target) || selecting() || fromSystemEdge(way, x, y) || !pans(target, way) || canScrollToward(target, way)

const startDrag = (event: TouchEvent, press: Press, way: Way, touch: Touch) => {
  if (pageKeeps(event, press, way)) return
  post(swipeStart, { way })
  return follow(host, alongWay(way, touch.clientX, touch.clientY), event.timeStamp)
}

export const relaySwipes = () => {
  let press: Press | undefined

  const release = ({ timeStamp }: TouchEvent) => {
    press?.drag?.end(timeStamp)
    press = undefined
  }

  listen(
    window,
    'touchstart',
    (event: TouchEvent) => {
      release(event)
      const [touch] = event.touches
      if (event.touches.length === 1 && touch) press = { x: touch.clientX, y: touch.clientY, target: event.target }
    },
    { passive: true },
  )

  listen(
    window,
    'touchmove',
    (event: TouchEvent) => {
      const [touch] = event.touches
      if (!press || !touch) return
      if (!press.way) {
        const way = direction(touch.clientX - press.x, touch.clientY - press.y)
        if (way === 'undecided') return
        press.way = way
        press.drag = startDrag(event, press, way, touch)
      }
      if (!press.drag) {
        press = undefined
        return
      }
      press.drag.move(alongWay(press.way, touch.clientX, touch.clientY), event.timeStamp)
    },
    { passive: true },
  )

  listen(window, 'touchend', release)
  listen(window, 'touchcancel', release)
}
