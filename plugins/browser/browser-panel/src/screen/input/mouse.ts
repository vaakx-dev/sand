import type { MouseButton, Point, UserInput } from '@sand/browser-engine/contract'
import { modifiers } from './keys'

type MouseType = 'mousePressed' | 'mouseReleased' | 'mouseMoved'

const doubleClickMs = 500
const doubleClickSlop = 5

export const buttonOf = (button: number): MouseButton => (['left', 'middle', 'right'] as const)[button] ?? 'none'

export const heldButton = (buttons: number): MouseButton => {
  if (buttons & 1) return 'left'
  if (buttons & 4) return 'middle'
  if (buttons & 2) return 'right'
  return 'none'
}

export const mouseInput = (type: MouseType, point: Point, event: MouseEvent, button: MouseButton, clickCount: number): UserInput => ({
  kind: 'mouse',
  type,
  x: point.x,
  y: point.y,
  button,
  clickCount,
  modifiers: modifiers(event),
})

export const clickCounter = () => {
  let last = { at: 0, x: 0, y: 0, button: -1, count: 0 }
  return (event: PointerEvent) => {
    const repeated =
      event.button === last.button &&
      event.timeStamp - last.at < doubleClickMs &&
      Math.abs(event.clientX - last.x) < doubleClickSlop &&
      Math.abs(event.clientY - last.y) < doubleClickSlop
    last = { at: event.timeStamp, x: event.clientX, y: event.clientY, button: event.button, count: repeated ? last.count + 1 : 1 }
    return Math.max(event.detail, last.count)
  }
}
