import type { Box, Screenshot, UiElement } from '@sand/computers/contract'
import type { Finder, Hit } from '../src/contract'
import { contains } from '../src/frame'
import { fill } from '../src/image/draw'
import { decode, encode } from '../src/image/raster'

const green = [0, 255, 0] as const

export const screen = async (width: number, height: number, target: Box): Promise<Screenshot> => {
  const raster = { width, height, rgba: new Uint8Array(width * height * 4).fill(255) }
  const rect = { left: target.left * width, top: target.top * height, width: (target.right - target.left) * width, height: (target.bottom - target.top) * height }
  fill(raster, rect, green)
  return { png: await encode(raster), width, height }
}

const greenCentre = async ({ png }: Screenshot) => {
  const { width, height, rgba } = await decode(png)
  let count = 0
  let sumX = 0
  let sumY = 0
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4
      if (rgba[at]! < 60 && rgba[at + 1]! > 200 && rgba[at + 2]! < 60) {
        count++
        sumX += x + 0.5
        sumY += y + 0.5
      }
    }
  return count ? { point: { x: sumX / count / width, y: sumY / count / height }, share: count / (width * height) } : null
}

const smallest = (elements: UiElement[], point: { x: number; y: number }) =>
  elements.filter(element => contains(element.box, point)).sort((a, b) => area(a.box) - area(b.box))[0]

const area = (box: Box) => (box.right - box.left) * (box.bottom - box.top)

export interface Seen {
  width: number
  height: number
  elements: UiElement[]
}

export const greenFinder = (answer: 'point' | 'ref', sureAt = 0.01) => {
  const seen: Seen[] = []
  const finder: Finder = {
    id: 'green',
    label: 'green',
    async locate({ screenshot, elements = [] }) {
      seen.push({ width: screenshot.width, height: screenshot.height, elements })
      const found = await greenCentre(screenshot)
      const element = found && answer === 'ref' ? smallest(elements, found.point) : undefined
      const hit: Hit = element ? { kind: 'element', ref: element.ref } : found && { kind: 'point', ...found.point }
      return { hit, confidence: found ? Math.min(1, found.share / sureAt) : null, usage: { inputTokens: 10, outputTokens: 2 }, costUsd: 0.001, ms: 1 }
    },
  }
  return { finder, seen }
}
