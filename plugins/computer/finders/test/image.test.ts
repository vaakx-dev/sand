import { expect, test } from 'bun:test'
import { tag, tagSize } from '../src/image/draw'
import { crop, decode, encode } from '../src/image/raster'
import { zoomed } from '../src/image/view'
import { screen } from './fakes'

const pixel = (raster: { width: number; rgba: Uint8Array }, x: number, y: number) => [...raster.rgba.subarray((y * raster.width + x) * 4, (y * raster.width + x) * 4 + 3)]

test('a raster survives a PNG round trip', async () => {
  const raster = { width: 5, height: 3, rgba: new Uint8Array(5 * 3 * 4).map((_, at) => (at % 4 === 3 ? 255 : (at * 7) % 256)) }
  expect(await decode(await encode(raster))).toEqual(raster)
})

test('crop copies the rows of a rectangle', () => {
  const raster = { width: 4, height: 4, rgba: new Uint8Array(64).map((_, at) => at) }
  const part = crop(raster, 1, 2, 2, 1)
  expect([...part.rgba]).toEqual([...raster.rgba.subarray(36, 44)])
})

test('a zoomed window shows its part of the screen at full size', async () => {
  const shot = await screen(400, 200, { left: 0.5, top: 0.5, right: 1, bottom: 1 })
  const view = await decode((await zoomed(shot, { left: 0.5, top: 0.5, right: 1, bottom: 1 })).png)
  expect([view.width, view.height]).toEqual([400, 200])
  expect(pixel(view, 200, 100)).toEqual([0, 255, 0])
})

test('tags draw white digits on their colour', () => {
  const raster = { width: 40, height: 20, rgba: new Uint8Array(40 * 20 * 4) }
  tag(raster, 0, 0, '10', [200, 0, 0], 2)
  expect(tagSize('10', 2)).toEqual({ width: 18, height: 14 })
  expect(pixel(raster, 0, 0)).toEqual([200, 0, 0])
  expect(pixel(raster, 4, 2)).toEqual([255, 255, 255])
})
