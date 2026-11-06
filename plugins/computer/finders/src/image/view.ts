import type { Box, Screenshot, UiElement } from '@sand/computers/contract'
import { outline, tag, tagSize, type Color } from './draw'
import { crop, decode, encode } from './raster'

const palette: Color[] = [
  [230, 25, 75],
  [0, 130, 200],
  [60, 160, 60],
  [245, 110, 20],
  [145, 30, 180],
  [0, 128, 128],
]

const pixels = (box: Box, width: number, height: number) => {
  const left = Math.min(width - 1, Math.floor(box.left * width))
  const top = Math.min(height - 1, Math.floor(box.top * height))
  return {
    left,
    top,
    width: Math.max(1, Math.min(width - left, Math.round((box.right - box.left) * width))),
    height: Math.max(1, Math.min(height - top, Math.round((box.bottom - box.top) * height))),
  }
}

export const zoomed = async (screenshot: Screenshot, window: Box): Promise<Screenshot> => {
  const raster = await decode(screenshot.png)
  const rect = pixels(window, raster.width, raster.height)
  const part = crop(raster, rect.left, rect.top, rect.width, rect.height)
  return { png: await encode(part, screenshot.width, screenshot.height), width: screenshot.width, height: screenshot.height }
}

export type Placement = 'outside' | 'center'

type Rect = ReturnType<typeof pixels>

interface Size {
  width: number
  height: number
}

const overlaps = (a: Rect, b: Rect) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height

const inside = (rect: Rect, bounds: Size) => rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= bounds.width && rect.top + rect.height <= bounds.height

const outside = (rect: Rect, size: Size, taken: Rect[], bounds: Size): Rect => {
  const spots = [
    { left: rect.left, top: rect.top - size.height },
    { left: rect.left - size.width, top: rect.top },
    { left: rect.left, top: rect.top + rect.height },
    { left: rect.left + rect.width, top: rect.top },
  ].map(spot => ({ ...spot, ...size }))
  return spots.find(spot => inside(spot, bounds) && !taken.some(other => overlaps(spot, other))) ?? { left: rect.left, top: rect.top, ...size }
}

const centered = (rect: Rect, size: Size): Rect => ({ left: Math.round(rect.left + (rect.width - size.width) / 2), top: Math.round(rect.top + (rect.height - size.height) / 2), ...size })

const places: Record<Placement, { zoom: number; at: (rect: Rect, size: Size, taken: Rect[], bounds: Size) => Rect }> = {
  outside: { zoom: 1, at: outside },
  center: { zoom: 2, at: centered },
}

export const marked = async (screenshot: Screenshot, marks: UiElement[], placement: Placement): Promise<Screenshot> => {
  const raster = await decode(screenshot.png)
  const place = places[placement]
  const scale = Math.max(2, Math.round(Math.max(raster.width, raster.height) / 800)) * place.zoom
  const rects = marks.map(mark => pixels(mark.box, raster.width, raster.height))
  const colors = marks.map((_, index) => palette[index % palette.length]!)
  rects.forEach((rect, index) => outline(raster, rect, colors[index]!, Math.max(1, scale / place.zoom / 2)))
  const taken: Rect[] = []
  marks.forEach((mark, index) => {
    const spot = place.at(rects[index]!, tagSize(mark.ref, scale), taken, raster)
    taken.push(spot)
    tag(raster, spot.left, spot.top, mark.ref, colors[index]!, scale)
  })
  return { png: await encode(raster), width: raster.width, height: raster.height }
}
