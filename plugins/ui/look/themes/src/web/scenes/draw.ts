import type { Mode } from '../../palette'

export type Scale = Record<string, string>

export interface Colors {
  neutral: Scale
  accent: Scale
}

export type Pen = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type Scene = (g: Pen, w: number, h: number, t: number, colors: Colors, mode: Mode) => void

export const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(value => (value + 0.5) / 16)

export const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

export const rgbOf = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgba = (hex: string, alpha: number) => `rgba(${rgbOf(hex).join(',')},${alpha})`

export const smooth = (from: number, to: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return k * k * (3 - 2 * k)
}

export const isPhone = (w: number) => w < 768

export interface Column {
  side: number
  left: number
  right: number
  top: number
  bottom: number
  feather: number
}

export const columnOf = (w: number, h: number): Column => {
  const desk = !isPhone(w)
  const side = desk ? 288 : 0
  const main = w - side
  const width = Math.min(768, main)
  const left = desk ? side + (main - width) / 2 + 16 : -2000
  return {
    side,
    left,
    right: desk ? left + width - 32 : w + 2000,
    top: desk ? 70 : 84,
    bottom: h - (desk ? 140 : 112),
    feather: desk ? 110 : 64,
  }
}

export const calmness = (z: Column, x: number, y: number) => {
  const dx = Math.max(z.left - x, 0, x - z.right)
  const dy = Math.max(z.top - y, 0, y - z.bottom)
  const d = dx || dy ? Math.hypot(dx, dy) : -Math.min(x - z.left, z.right - x, y - z.top, z.bottom - y)
  return smooth(-z.feather, z.feather * 0.6, d)
}

const calmStep = 8

export const calm = (g: Pen, w: number, h: number, color: string, strength: number) => {
  const z = columnOf(w, h)
  const cols = Math.ceil(w / calmStep) + 1
  const rows = Math.ceil(h / calmStep) + 1
  const layer = new OffscreenCanvas(cols, rows)
  const pen = layer.getContext('2d')
  if (!pen) return
  const image = pen.createImageData(cols, rows)
  const [r, gg, b] = rgbOf(color)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      image.data[i] = r
      image.data[i + 1] = gg
      image.data[i + 2] = b
      image.data[i + 3] = Math.round(255 * strength * (1 - calmness(z, x * calmStep, y * calmStep)))
    }
  pen.putImageData(image, 0, 0)
  g.save()
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(layer, 0, 0, cols * calmStep, rows * calmStep)
  g.restore()
}
