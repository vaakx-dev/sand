import { expect, test } from 'bun:test'
import { zoomGesture, type ZoomChange } from '../src/gesture/zoom'

const touch = (type: string, points: [number, number][]) =>
  Object.assign(new Event(type, { cancelable: true }), { touches: points.map(([clientX, clientY]) => ({ clientX, clientY })) })

test('two fingers put down on the same spot zoom by how far they then spread, never by an endless factor', () => {
  const surface = new EventTarget()
  const factors: number[] = []
  const stop = zoomGesture(surface, { zoom: ({ factor }: ZoomChange) => factors.push(factor), toggle: () => {} }, { wheel: 'zooms', points: 'client' })
  surface.dispatchEvent(touch('touchstart', [[100, 100], [100, 100]]))
  surface.dispatchEvent(touch('touchmove', [[90, 100], [110, 100]]))
  surface.dispatchEvent(touch('touchmove', [[80, 100], [120, 100]]))
  stop()
  expect(factors).toEqual([2])
})
