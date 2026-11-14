import { canvas, listen, mount, onMedia, onRaf } from '@vaakx-dev/vrui'
import type { SceneId } from '../contract'
import type { Mode } from '../palette'
import { sceneCanvasStyle } from './look'
import { scenes, type Colors } from './scenes'

const reducedMotion = '(prefers-reduced-motion: reduce)'

const frameMs = 1000 / 30

const restingTime = 12

export interface SceneRun {
  id: SceneId
  colors: Colors
  mode: Mode
  moving: boolean
}

export const runScene = ({ id, colors, mode, moving }: SceneRun) => {
  const { draw } = scenes[id]
  const node = canvas({ 'aria-hidden': 'true', 'data-part': 'background', style: sceneCanvasStyle }) as HTMLCanvasElement
  const pen = node.getContext('2d')
  let reduced = false
  let frame: (() => void) | undefined
  let last = 0
  const started = performance.now()

  const paint = (now: number) => {
    if (!pen) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    if (node.width !== Math.round(w * ratio) || node.height !== Math.round(h * ratio)) {
      node.width = Math.round(w * ratio)
      node.height = Math.round(h * ratio)
    }
    pen.setTransform(ratio, 0, 0, ratio, 0, 0)
    draw(pen, w, h, still() ? restingTime : restingTime + (now - started) / 1000, colors, mode)
  }

  const still = () => reduced || !moving || document.hidden

  const tick = (now: number) => {
    frame = undefined
    if (still()) return
    if (now - last >= frameMs) {
      last = now
      paint(now)
    }
    frame = onRaf(tick)
  }

  const restart = () => {
    frame?.()
    paint(performance.now())
    if (!still()) frame = onRaf(tick)
  }

  const unmount = mount(document.body, node)
  const stops = [
    onMedia(reducedMotion, matches => {
      reduced = matches
      restart()
    }),
    listen(window, 'resize', restart),
    listen(document, 'visibilitychange', restart),
  ]
  return () => {
    frame?.()
    for (const stop of stops) stop()
    unmount()
  }
}
