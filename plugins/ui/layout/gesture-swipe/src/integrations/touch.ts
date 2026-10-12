import type { Swipe } from '@sand/protocol'
import { canScrollToward, direction, editing, follow, hasOpenLayer, selecting, type Drag } from '@sand/kit/web'
import { listen } from '@vaakx-dev/vrui'

const edge = 24

interface Press {
  id: number
  x: number
  y: number
  target: EventTarget | null
  drag?: Drag
}

const atEdge = (x: number) => x < edge || x > document.documentElement.clientWidth - edge

const blocked = (target: EventTarget | null) => hasOpenLayer(true) || editing(target) || selecting()

const startDrag = (press: Press, { clientX, timeStamp }: PointerEvent, begin: () => Swipe | undefined) => {
  if (canScrollToward(press.target, clientX - press.x)) return
  const swipe = begin()
  return swipe && follow(swipe, clientX, timeStamp)
}

export const swipeGesture = (begin: () => Swipe | undefined) => {
  let press: Press | undefined

  listen(document, 'pointerdown', ({ pointerType, isPrimary, pointerId, clientX, clientY, target }: PointerEvent) => {
    if (pointerType !== 'touch' || !isPrimary || blocked(target) || atEdge(clientX)) return
    press = { id: pointerId, x: clientX, y: clientY, target }
  })

  listen(document, 'pointermove', (event: PointerEvent) => {
    if (press?.id !== event.pointerId) return
    if (press.drag) {
      press.drag.move(event.clientX, event.timeStamp)
      return
    }
    const way = direction(event.clientX - press.x, event.clientY - press.y)
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
