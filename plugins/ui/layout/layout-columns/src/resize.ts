import { color, div, sig, stored, type Sig } from '@sand/dom'

export type Edge = 'side' | 'aside'

const limits: Record<Edge, [number, number]> = { side: [200, 480], aside: [280, 800] }
const mainRoom = 360

export type Widths = Sig<Partial<Record<Edge, number>>>

export const savedWidths = (): Widths => stored<Partial<Record<Edge, number>>>('sand.layout.widths', {})

export const gripCss = `
[data-grip] { position: absolute; top: 0; bottom: 0; z-index: 10; width: 9px; cursor: col-resize; touch-action: none; }
[data-grip="side"] { right: -5px; }
[data-grip="aside"] { left: -5px; }
[data-grip]::after { content: ""; position: absolute; top: 0; bottom: 0; left: 4px; width: 1px; transition: background-color .15s; }
[data-grip]:hover::after, [data-grip][data-dragging]::after { background: ${color('accent', 500)}; }
[data-sized] > [data-fill] > * { width: 100%; }
`

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
  return div({
    'data-grip': edge,
    'data-dragging': () => (dragging.get() ? '' : null),
    title: 'Drag to resize, double-click to reset',
    class: () => (hidden() ? 'hidden' : null),
    onPointerDown: event => {
      if (event.button !== 0) return
      event.preventDefault()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      dragging.set({ start: column().getBoundingClientRect().width, from: event.clientX, others: other().getBoundingClientRect().width })
    },
    onPointerMove: event => {
      const drag = dragging.get()
      if (drag) widths.set({ ...widths.get(), [edge]: clamp(edge, drag.start + (event.clientX - drag.from) * direction, drag.others) })
    },
    onPointerUp: end,
    onPointerCancel: end,
    onDblClick: () => forget(widths, edge),
  })
}

export const sizedStyle = (widths: Widths, edge: Edge) => {
  const width = widths.get()[edge]
  return width ? { width: `${width}px`, maxWidth: 'none' } : null
}
