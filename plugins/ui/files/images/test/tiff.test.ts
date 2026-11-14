import { expect, test } from 'bun:test'
import { decodeTiff } from '../src/web/decoder/tiff'

interface Sample {
  width: number
  height: number
  strip: Uint8Array
  compression?: number
  next?: number
}

const IFD_OFFSET = 8

const tiff = ({ width, height, strip, compression = 1, next = 0 }: Sample) => {
  const entries = [
    [256, 4, width],
    [257, 4, height],
    [258, 3, 8],
    [259, 3, compression],
    [262, 3, 1],
    [273, 4, 0],
    [277, 3, 1],
    [278, 4, height],
    [279, 4, strip.length],
  ]
  const stripOffset = IFD_OFFSET + 2 + entries.length * 12 + 4
  const bytes = new Uint8Array(stripOffset + strip.length)
  const view = new DataView(bytes.buffer)
  bytes.set([0x49, 0x49, 42, 0])
  view.setUint32(4, IFD_OFFSET, true)
  view.setUint16(IFD_OFFSET, entries.length, true)
  entries.forEach(([tag, type, value], index) => {
    const at = IFD_OFFSET + 2 + index * 12
    view.setUint16(at, tag!, true)
    view.setUint16(at + 2, type!, true)
    view.setUint32(at + 4, 1, true)
    if (type === 3) view.setUint16(at + 8, value!, true)
    else view.setUint32(at + 8, tag === 273 ? stripOffset : value!, true)
  })
  view.setUint32(stripOffset - 4, next, true)
  bytes.set(strip, stripOffset)
  return bytes.buffer
}

const zlib = (data: Uint8Array<ArrayBuffer>) => new Uint8Array([0x78, 0x9c, ...Bun.deflateSync(data), 0, 0, 0, 0])

test('a grayscale TIFF decodes to its pixels', async () => {
  const decoded = await decodeTiff(tiff({ width: 3, height: 2, strip: new Uint8Array([0, 50, 100, 150, 200, 250]) }))
  if (!('picture' in decoded)) throw new Error(decoded.error)
  expect({ ...decoded.picture, rgba: [...decoded.picture.rgba] }).toEqual({
    width: 3,
    height: 2,
    pages: 1,
    rgba: [0, 0, 0, 255, 50, 50, 50, 255, 100, 100, 100, 255, 150, 150, 150, 255, 200, 200, 200, 255, 250, 250, 250, 255],
  })
})

test('an image too large to show is refused from its header alone', async () => {
  expect(await decodeTiff(tiff({ width: 30_000, height: 30_000, strip: new Uint8Array(4) }))).toEqual({
    error: 'it is 30,000 × 30,000 pixels, and the viewer opens images up to 50 megapixels',
  })
})

test('a TIFF whose pages loop back on themselves is refused instead of read forever', async () => {
  expect(await decodeTiff(tiff({ width: 2, height: 2, strip: new Uint8Array(4), next: IFD_OFFSET }))).toEqual({ error: 'its TIFF structure is damaged' })
})

test('a compressed strip that unpacks to far more than the image holds is refused before decoding', async () => {
  const bomb = zlib(new Uint8Array(8 * 1024 * 1024))
  expect(await decodeTiff(tiff({ width: 3, height: 2, strip: bomb, compression: 8 }))).toEqual({ error: 'it holds more image data than the viewer opens' })
})
