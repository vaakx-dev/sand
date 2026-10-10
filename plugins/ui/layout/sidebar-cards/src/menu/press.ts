import { onTimeout } from '@sand/dom'

const holdMs = 450
const slop = 10

export interface PressAt {
  x: number
  y: number
  touch: boolean
  from: HTMLElement
}

const keyboardPoint = (node: HTMLElement) => {
  const box = node.getBoundingClientRect()
  return { x: box.left + 16, y: box.bottom - 4 }
}

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
        if (event.pointerType !== 'touch') return
        start = { x: event.clientX, y: event.clientY, node: event.currentTarget as HTMLElement }
        stopTimer = onTimeout(hold, holdMs)
      },
      onPointerMove(event: PointerEvent) {
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > slop) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onContextMenu(event: MouseEvent) {
        event.preventDefault()
        if (start) return hold()
        if (held) return
        const node = event.currentTarget as HTMLElement
        const point = event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : keyboardPoint(node)
        open({ ...point, touch: false, from: node })
      },
    },
    held() {
      const was = held
      held = false
      return was
    },
  }
}
