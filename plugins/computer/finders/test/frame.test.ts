import { expect, test } from 'bun:test'
import { around, boxFromWindow, cellAt, cells, fromWindow, grow } from '../src/frame'

test('a window maps its points back to the whole screen', () => {
  const window = { left: 0.5, top: 0.25, right: 0.75, bottom: 0.5 }
  expect(fromWindow(window, { x: 0.5, y: 0.5 })).toEqual({ x: 0.625, y: 0.375 })
  expect(boxFromWindow(window, { left: 0, top: 0, right: 1, bottom: 1 })).toEqual(window)
})

test('a window around a point stays on the screen and keeps its size', () => {
  expect(around({ x: 0.5, y: 0.5 }, 0.5)).toEqual({ left: 0.25, top: 0.25, right: 0.75, bottom: 0.75 })
  expect(around({ x: 0.05, y: 0.98 }, 0.5)).toEqual({ left: 0, top: 0.5, right: 0.5, bottom: 1 })
  expect(around({ x: 0.3, y: 0.3 }, 2)).toEqual({ left: 0, top: 0, right: 1, bottom: 1 })
})

test('growing a box adds a margin on each side', () => {
  const grown = grow({ left: 0.4, top: 0.4, right: 0.6, bottom: 0.6 }, 0.25)
  expect(grown.left).toBeCloseTo(0.35)
  expect(grown.right).toBeCloseTo(0.65)
})

test('grid cells number left to right, top to bottom', () => {
  const layout = cells(3)
  expect(layout).toHaveLength(9)
  expect(layout[4]!.box).toEqual({ left: 1 / 3, top: 1 / 3, right: 2 / 3, bottom: 2 / 3 })
  expect(cellAt(layout, 3, { x: 0.9, y: 0.1 }).ref).toBe('3')
  expect(cellAt(layout, 3, { x: 1, y: 1 }).ref).toBe('9')
})
