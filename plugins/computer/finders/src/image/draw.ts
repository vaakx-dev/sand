import type { Raster } from './raster'

export type Color = readonly [number, number, number]

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

const white: Color = [255, 255, 255]

const digits = [
  '111101101101111',
  '010110010010111',
  '111001111100111',
  '111001111001111',
  '101101111001001',
  '111100111001111',
  '111100111101111',
  '111001001001001',
  '111101111101111',
  '111101111001111',
]

const glyph = { width: 3, height: 5, gap: 1, pad: 1 }

export const fill = ({ width, height, rgba }: Raster, rect: Rect, color: Color) => {
  const left = Math.max(0, Math.round(rect.left))
  const top = Math.max(0, Math.round(rect.top))
  const right = Math.min(width, Math.round(rect.left + rect.width))
  const bottom = Math.min(height, Math.round(rect.top + rect.height))
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const at = (y * width + x) * 4
      rgba[at] = color[0]
      rgba[at + 1] = color[1]
      rgba[at + 2] = color[2]
      rgba[at + 3] = 255
    }
}

export const outline = (raster: Raster, { left, top, width, height }: Rect, color: Color, thickness: number) => {
  fill(raster, { left, top, width, height: thickness }, color)
  fill(raster, { left, top: top + height - thickness, width, height: thickness }, color)
  fill(raster, { left, top, width: thickness, height }, color)
  fill(raster, { left: left + width - thickness, top, width: thickness, height }, color)
}

export const tagSize = (text: string, scale: number) => ({
  width: (text.length * (glyph.width + glyph.gap) - glyph.gap + 2 * glyph.pad) * scale,
  height: (glyph.height + 2 * glyph.pad) * scale,
})

export const tag = (raster: Raster, left: number, top: number, text: string, color: Color, scale: number) => {
  fill(raster, { left, top, ...tagSize(text, scale) }, color)
  for (let index = 0; index < text.length; index++) {
    const bits = digits[Number(text[index])]!
    const x0 = left + (glyph.pad + index * (glyph.width + glyph.gap)) * scale
    for (let bit = 0; bit < bits.length; bit++) {
      if (bits[bit] !== '1') continue
      const x = x0 + (bit % glyph.width) * scale
      const y = top + (glyph.pad + Math.floor(bit / glyph.width)) * scale
      fill(raster, { left: x, top: y, width: scale, height: scale }, white)
    }
  }
}
