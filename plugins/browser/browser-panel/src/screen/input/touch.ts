import type { Point, UserInput } from '@sand/browser-engine/contract'
import { mouseInput } from './mouse'

export type WheelInput = Extract<UserInput, { kind: 'wheel' }>

const slop = 8

export const touchGesture = (send: (input: UserInput) => void, scroll: (input: WheelInput, owner: Node) => void) => {
  let start: { x: number; y: number } | undefined
  let last: Point | undefined
  let dragging = false

  const cancel = () => {
    start = undefined
    last = undefined
    dragging = false
  }

  return {
    down(event: PointerEvent, point: Point) {
      start = { x: event.clientX, y: event.clientY }
      last = point
      dragging = false
    },
    move(event: PointerEvent, point: Point) {
      if (!start || !last) return
      dragging ||= Math.hypot(event.clientX - start.x, event.clientY - start.y) > slop
      if (!dragging) return
      scroll({ kind: 'wheel', x: point.x, y: point.y, deltaX: last.x - point.x, deltaY: last.y - point.y, modifiers: 0 }, event.currentTarget as Node)
      last = point
    },
    up(event: PointerEvent, point: Point) {
      if (start && !dragging) {
        send(mouseInput('mousePressed', point, event, 'left', 1))
        send(mouseInput('mouseReleased', point, event, 'left', 1))
      }
      cancel()
    },
    cancel,
  }
}
