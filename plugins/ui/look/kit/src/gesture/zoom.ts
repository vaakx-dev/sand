import { joinDisposers } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'

interface Point {
  x: number
  y: number
}

interface ZoomChange {
  factor: number
  from: Point
  to: Point
}

interface ZoomTarget {
  zoom(change: ZoomChange): void
  toggle(at: Point): void
}

type WheelUse = 'zooms' | 'scrolls'

type Surface = 'fixed' | 'scaled'

interface ZoomOptions {
  wheel: WheelUse
  surface: Surface
}

interface Pinch {
  spread: number
  center: Point
}

interface Tap {
  at: Point
  time: number
}

const TAP_SLOP_PX = 10
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_REACH_PX = 32
const WHEEL_SPEED = 300
const CONTROLS = 'a[href], button, input, select, textarea, label, summary, [role=button], [contenteditable]'

const pointOf = (touch: Touch): Point => ({ x: touch.clientX, y: touch.clientY })

const distance = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y)

const pinchOf = (first: Touch, second: Touch): Pinch => ({
  spread: distance(pointOf(first), pointOf(second)),
  center: { x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 },
})

const onControl = (target: EventTarget | null) => target instanceof Element && target.closest(CONTROLS) !== null

const followsTap = (last: Tap | undefined, tap: Tap) => last !== undefined && tap.time - last.time <= DOUBLE_TAP_MS && distance(last.at, tap.at) <= DOUBLE_TAP_REACH_PX

const wheelZooms = (event: WheelEvent, use: WheelUse) => use === 'zooms' || event.ctrlKey

const zoomGesture = (node: EventTarget, target: ZoomTarget, { wheel, surface }: ZoomOptions) => {
  let pinch: Pinch | undefined
  let press: Tap | undefined
  let lastTap: Tap | undefined

  const start = (event: TouchEvent) => {
    const [first, second] = event.touches
    press = first && !second && !onControl(event.target) ? { at: pointOf(first), time: event.timeStamp } : undefined
    pinch = first && second ? pinchOf(first, second) : undefined
    if (pinch) lastTap = undefined
  }

  const move = (event: TouchEvent) => {
    const [first, second] = event.touches
    if (press && first && distance(press.at, pointOf(first)) > TAP_SLOP_PX) press = undefined
    if (!pinch || !first || !second) return
    event.preventDefault()
    const next = pinchOf(first, second)
    if (!pinch.spread) {
      pinch = next
      return
    }
    target.zoom({ factor: next.spread / pinch.spread, from: pinch.center, to: next.center })
    if (surface === 'fixed') pinch = next
  }

  const end = (event: TouchEvent) => {
    const tap = press && !event.touches.length ? { at: press.at, time: event.timeStamp } : undefined
    press = undefined
    if (event.touches.length < 2) pinch = undefined
    if (!tap) return
    if (!followsTap(lastTap, tap)) {
      lastTap = tap
      return
    }
    event.preventDefault()
    lastTap = undefined
    target.toggle(tap.at)
  }

  const cancel = () => {
    pinch = undefined
    press = undefined
  }

  const turn = (event: WheelEvent) => {
    if (!wheelZooms(event, wheel)) return
    event.preventDefault()
    const at = { x: event.clientX, y: event.clientY }
    target.zoom({ factor: Math.exp(-event.deltaY / WHEEL_SPEED), from: at, to: at })
  }

  return joinDisposers(
    listen(node, 'touchstart', start, { passive: true }),
    listen(node, 'touchmove', move, { passive: false }),
    listen(node, 'touchend', end, { passive: false }),
    listen(node, 'touchcancel', cancel),
    listen(node, 'wheel', turn, { passive: false }),
  )
}

export { zoomGesture, type Point, type Surface, type WheelUse, type ZoomChange, type ZoomOptions, type ZoomTarget }
