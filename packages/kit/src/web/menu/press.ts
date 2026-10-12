import type { PressAt } from '@sand/protocol'
import { onTimeout } from '@vaakx-dev/vrui'

const holdMs = 450
const slop = 10

const keyboardPoint = (node: HTMLElement) => {
  const box = node.getBoundingClientRect()
  return { x: box.left + 16, y: box.bottom - 4 }
}

const pointOf = (event: MouseEvent, node: HTMLElement) => (event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : keyboardPoint(node))

export const pressMenu = (open: (at: PressAt) => void) => {
  let start: { x: number; y: number; node: HTMLElement } | undefined
  let stopTimer: (() => void) | undefined
  let held = false

  const cancel = () => {
    stopTimer?.()
    stopTimer = undefined
    start = undefined
  }

  const hold = () => {
    if (!start) return
    const { x, y, node } = start
    cancel()
    held = true
    navigator.vibrate?.(10)
    open({ x, y, touch: true, from: node })
  }

  return {
    props: {
      onPointerDown(event: PointerEvent) {
        held = false
        cancel()
        const node = event.currentTarget
        if (event.pointerType !== 'touch' || !(node instanceof HTMLElement)) return
        start = { x: event.clientX, y: event.clientY, node }
        stopTimer = onTimeout(hold, holdMs, node)
      },
      onPointerMove(event: PointerEvent) {
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > slop) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onContextMenu(event: MouseEvent) {
        event.preventDefault()
        if (start) return hold()
        const node = event.currentTarget
        if (held || !(node instanceof HTMLElement)) return
        open({ ...pointOf(event, node), touch: false, from: node })
      },
    },
    held() {
      const was = held
      held = false
      return was
    },
  }
}
