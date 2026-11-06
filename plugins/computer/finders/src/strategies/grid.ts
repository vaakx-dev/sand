import type { Point } from '@sand/computers/contract'
import { pointOf, type Finder, type Located } from '../contract'
import { boxFromWindow, cellAt, cells, fromWindow, grow, whole } from '../frame'
import { marked, zoomed } from '../image/view'
import { spent } from './spent'

export interface GridOptions {
  size: number
  rounds: number
}

const margin = 0.25

export const grid = (finder: Finder, { size, rounds }: GridOptions): Finder => ({
  id: `${finder.id}/grid-${size}x${rounds}`,
  label: `${finder.label}, ${size}×${size} grid for ${rounds} rounds`,
  async locate({ screenshot, target }, signal) {
    const started = performance.now()
    const layout = cells(size)
    const done: Located[] = []
    let window = whole
    let point: Point | null = null
    let sure: number | null = null
    while (done.length < rounds) {
      const shot = await marked(window === whole ? screenshot : await zoomed(screenshot, window), layout, 'center')
      const found = await finder.locate({ screenshot: shot, target, elements: layout }, signal)
      done.push(found)
      const local = pointOf(found.hit, layout)
      if (!local) break
      point = fromWindow(window, local)
      sure = found.confidence
      window = grow(boxFromWindow(window, cellAt(layout, size, local).box), margin)
    }
    return { hit: point && { kind: 'point', ...point }, confidence: sure, ...spent(done), ms: performance.now() - started }
  },
})
