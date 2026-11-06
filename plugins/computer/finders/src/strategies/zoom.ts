import type { Box, Point } from '@sand/computers/contract'
import { pointOf, type Finder, type Located } from '../contract'
import { around, fromWindow, whole } from '../frame'
import { zoomed } from '../image/view'
import { spent } from './spent'

export interface ZoomOptions {
  scale: number
  rounds: number
  confidence: number
}

const closer = (window: Box, point: Point, scale: number) => around(point, (window.right - window.left) / scale, (window.bottom - window.top) / scale)

export const zoom = (finder: Finder, { scale, rounds, confidence }: ZoomOptions): Finder => ({
  id: `${finder.id}/zoom-${scale}x${rounds}`,
  label: `${finder.label}, zoom ${scale}× up to ${rounds} rounds`,
  async locate({ screenshot, target }, signal) {
    const started = performance.now()
    const done: Located[] = []
    let window = whole
    let point: Point | null = null
    let sure: number | null = null
    while (done.length < rounds) {
      const shot = window === whole ? screenshot : await zoomed(screenshot, window)
      const found = await finder.locate({ screenshot: shot, target }, signal)
      done.push(found)
      const local = pointOf(found.hit)
      if (!local) break
      point = fromWindow(window, local)
      sure = found.confidence
      if ((sure ?? 0) >= confidence) break
      window = closer(window, point, scale)
    }
    return { hit: point && { kind: 'point', ...point }, confidence: sure, ...spent(done), ms: performance.now() - started }
  },
})
