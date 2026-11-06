import { promisify } from 'node:util'
import { deflate } from 'node:zlib'

const compress = promisify(deflate)

const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const rgb = 2
const level = 3

const chunk = (type: string, data: Uint8Array) => {
  const bytes = new Uint8Array(12 + data.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, data.length)
  bytes.set(new TextEncoder().encode(type), 4)
  bytes.set(data, 8)
  view.setUint32(8 + data.length, Bun.hash.crc32(bytes.subarray(4, 8 + data.length)))
  return bytes
}

const header = (width: number, height: number) => {
  const data = new Uint8Array(13)
  const view = new DataView(data.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  data.set([8, rgb, 0, 0, 0], 8)
  return data
}

export const encodePng = async (width: number, height: number, pixels: Uint8Array) => {
  const row = width * 3
  const filtered = new Uint8Array((row + 1) * height)
  for (let y = 0; y < height; y++) filtered.set(pixels.subarray(y * row, (y + 1) * row), y * (row + 1) + 1)
  const parts = [new Uint8Array(signature), chunk('IHDR', header(width, height)), chunk('IDAT', await compress(filtered, { level })), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  parts.reduce((offset, part) => {
    png.set(part, offset)
    return offset + part.length
  }, 0)
  return png
}
