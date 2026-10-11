import { div, sig, span, stored, type Sig } from '@sand/dom'

export type Edge = 'side' | 'aside'

const limits: Record<Edge, [number, number]> = { side: [200, 480], aside: [280, 800] }
const mainRoom = 360

export type Widths = Sig<Partial<Record<Edge, number>>>

export const savedWidths = (): Widths => stored<Partial<Record<Edge, number>>>('sand.layout.widths', {})

const placement: Record<Edge, string> = { side: '-right-1', aside: '-left-1' }

const clamp = (edge: Edge, width: number, others: number) => {
  const [min, max] = limits[edge]
  return Math.round(Math.max(min, Math.min(width, max, window.innerWidth - others - mainRoom)))
}

const forget = (widths: Widths, edge: Edge) => {
  const { [edge]: _, ...rest } = widths.get()
  widths.set(rest)
}

interface Drag {
  start: number
  from: number
  others: number
}

export const grip = (edge: Edge, column: () => HTMLElement, other: () => HTMLElement, widths: Widths, hidden: () => boolean) => {
  const direction = edge === 'side' ? 1 : -1
  const dragging = sig<Drag | undefined>(undefined)
  const end = () => dragging.set(undefined)
  const line = span({ class: ['absolute inset-y-0 left-1 w-px transition-colors group-hover:bg-accent-500', () => dragging.get() && 'bg-accent-500'] })
  const handle: HTMLElement = div({
    title: 'Drag to resize, double-click to reset',
    class: () => (hidden() ? 'hidden' : ['group absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none', placement[edge]]),
    onPointerDown: event => {
      if (event.button !== 0) return
      event.preventDefault()
      handle.setPointerCapture(event.pointerId)
      dragging.set({ start: column().getBoundingClientRect().width, from: event.clientX, others: other().getBoundingClientRect().width })
    },
    onPointerMove: event => {
      const drag = dragging.get()
      if (drag) widths.set({ ...widths.get(), [edge]: clamp(edge, drag.start + (event.clientX - drag.from) * direction, drag.others) })
    },
    onPointerUp: end,
    onPointerCancel: end,
    onDblClick: () => forget(widths, edge),
  }, line)
  return handle
}

export const sizedStyle = (widths: Widths, edge: Edge) => {
  const width = widths.get()[edge]
  return width ? { width: `${width}px`, maxWidth: 'none' } : null
}
