import type { Swipe } from '@sand/layout/contract'
import type { Drag } from '@sand/ui-kit/contract'
import { canScrollToward, direction, editing, follow, selecting } from '@sand/ui-kit/gesture'
import { listen } from '@vaakx-dev/vrui'
import { swipeEnd, swipeMove, swipeStart } from '../page/protocol'
import { post } from './post'

interface Press {
  x: number
  y: number
  target: EventTarget | null
  drag?: Drag
}

const host: Swipe = {
  move: dx => post(swipeMove, { dx }),
  end: velocity => post(swipeEnd, { velocity }),
}

const pansSideways = (target: EventTarget | null) => {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (!/auto|manipulation|pan-x/.test(getComputedStyle(node).touchAction)) return false
  }
  return true
}

const pageKeeps = (event: TouchEvent, { target }: Press, dx: number) =>
  event.defaultPrevented || editing(target) || selecting() || !pansSideways(target) || canScrollToward(target, dx)

const startDrag = (event: TouchEvent, press: Press, touch: Touch) => {
  if (pageKeeps(event, press, touch.clientX - press.x)) return
  post(swipeStart)
  return follow(host, touch.clientX, event.timeStamp)
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
      if (!press.drag) {
        const way = direction(touch.clientX - press.x, touch.clientY - press.y)
        if (way === 'undecided') return
        press.drag = way === 'sideways' ? startDrag(event, press, touch) : undefined
      }
      if (!press.drag) {
        press = undefined
        return
      }
      press.drag.move(touch.clientX, event.timeStamp)
    },
    { passive: true },
  )

  listen(window, 'touchend', release)
  listen(window, 'touchcancel', release)
}
