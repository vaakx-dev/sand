import { canvas } from '@vaakx-dev/vrui'
import type { Theme } from '../../contract'
import { type Mode, paletteOf } from '../../palette'
import { scenes, type Colors } from '../scenes'
import { rgba, type Pen } from '../scenes/draw'

const wide = 900
const tall = 600
const backing = 600

const block = (g: Pen, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  g.fillStyle = fill
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
}

const sketch = (g: Pen, { neutral, accent }: Colors, frosted: boolean) => {
  block(g, 0, 0, 220, tall, 0, rgba(neutral['950']!, frosted ? 0.78 : 1))
  for (let i = 0; i < 5; i++) block(g, 28, 90 + i * 52, 120 + ((i * 37) % 50), 14, 7, rgba(neutral['300']!, 0.35))
  block(g, 28, 142, 164, 34, 8, rgba(neutral['700']!, 0.8))
  block(g, 28, 150, 110, 14, 7, rgba(neutral['200']!, 0.55))
  block(g, 560, 60, 260, 40, 14, rgba(accent['500']!, 0.3))
  for (let i = 0; i < 4; i++) block(g, 290, 140 + i * 34, i === 3 ? 260 : 470 + ((i * 53) % 60), 13, 6, rgba(neutral['100']!, 0.6))
  block(g, 290, 300, 530, 90, 12, rgba(neutral['800']!, 0.78))
  for (let i = 0; i < 3; i++) block(g, 312, 322 + i * 22, 180 + i * 70, 10, 5, rgba(accent['300']!, 0.5))
  block(g, 270, 488, 570, 80, 18, rgba(neutral['800']!, 0.85))
  g.fillStyle = accent['500']!
  g.beginPath()
  g.arc(806, 540, 16, 0, Math.PI * 2)
  g.fill()
}

export const thumbnail = (theme: Theme | null, mode: Mode, sand: Colors) => {
  const node = canvas({ width: backing, height: (backing * tall) / wide, class: 'block h-auto w-full', 'aria-hidden': 'true' }) as HTMLCanvasElement
  const g = node.getContext('2d')
  if (!g) return node
  const colors = theme ? (paletteOf(theme, mode) as unknown as Colors) : sand
  const scale = backing / wide
  g.setTransform(scale, 0, 0, scale, 0, 0)
  if (theme?.scene) scenes[theme.scene].draw(g, wide, tall, 12, colors, mode)
  else {
    g.fillStyle = colors.neutral['900']!
    g.fillRect(0, 0, wide, tall)
  }
  g.setTransform(scale, 0, 0, scale, 0, 0)
  sketch(g, colors, Boolean(theme?.scene))
  return node
}
