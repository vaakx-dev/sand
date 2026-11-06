import type { Box, Point, UiElement } from '@sand/computers/contract'

export const whole: Box = { left: 0, top: 0, right: 1, bottom: 1 }

export const contains = ({ left, top, right, bottom }: Box, { x, y }: Point) => x >= left && x <= right && y >= top && y <= bottom

export const fromWindow = (window: Box, { x, y }: Point): Point => ({
  x: window.left + x * (window.right - window.left),
  y: window.top + y * (window.bottom - window.top),
})

export const boxFromWindow = (window: Box, box: Box): Box => {
  const start = fromWindow(window, { x: box.left, y: box.top })
  const end = fromWindow(window, { x: box.right, y: box.bottom })
  return { left: start.x, top: start.y, right: end.x, bottom: end.y }
}

const span = (middle: number, size: number) => {
  const start = Math.min(1 - size, Math.max(0, middle - size / 2))
  return [start, start + size] as const
}

export const around = ({ x, y }: Point, width: number, height = width): Box => {
  const [left, right] = span(x, Math.min(1, width))
  const [top, bottom] = span(y, Math.min(1, height))
  return { left, top, right, bottom }
}

export const grow = (box: Box, by: number) => {
  const width = (box.right - box.left) * (1 + 2 * by)
  const height = (box.bottom - box.top) * (1 + 2 * by)
  return around({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }, width, height)
}

export const cells = (size: number): UiElement[] =>
  Array.from({ length: size * size }, (_, index) => {
    const column = index % size
    const row = Math.floor(index / size)
    const box = { left: column / size, top: row / size, right: (column + 1) / size, bottom: (row + 1) / size }
    return { ref: String(index + 1), role: 'grid cell', name: '', box }
  })

const slot = (size: number, value: number) => Math.min(size - 1, Math.floor(Math.min(1, Math.max(0, value)) * size))

export const cellAt = (layout: UiElement[], size: number, { x, y }: Point) => layout[slot(size, y) * size + slot(size, x)]!
