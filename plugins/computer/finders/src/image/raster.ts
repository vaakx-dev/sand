export interface Raster {
  width: number
  height: number
  rgba: Uint8Array
}

const signature = 8

const chunks = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const found: { type: string; data: Uint8Array }[] = []
  for (let at = signature; at < png.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    found.push({ type, data: png.subarray(at + 8, at + 8 + length) })
    at += length + 12
  }
  return found
}

const joined = (parts: Uint8Array[]) => {
  const all = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) {
    all.set(part, at)
    at += part.length
  }
  return all
}

const paeth = (left: number, up: number, corner: number) => {
  const guess = left + up - corner
  const toLeft = Math.abs(guess - left)
  const toUp = Math.abs(guess - up)
  const toCorner = Math.abs(guess - corner)
  if (toLeft <= toUp && toLeft <= toCorner) return left
  return toUp <= toCorner ? up : corner
}

type Predict = (left: number, up: number, corner: number) => number

const predictors: Predict[] = [() => 0, left => left, (_, up) => up, (left, up) => (left + up) >> 1, paeth]

const unfilter = (packed: Uint8Array, width: number, height: number) => {
  const stride = width * 4
  const out = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const predict = predictors[packed[y * (stride + 1)]!]!
    const line = y * (stride + 1) + 1
    const row = y * stride
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? out[row + x - 4]! : 0
      const up = y > 0 ? out[row - stride + x]! : 0
      const corner = x >= 4 && y > 0 ? out[row - stride + x - 4]! : 0
      out[row + x] = (packed[line + x]! + predict(left, up, corner)) & 0xff
    }
  }
  return out
}

export const decode = async (png: Uint8Array): Promise<Raster> => {
  const rgba = await new Bun.Image(png).png({ compressionLevel: 1 }).bytes()
  const found = chunks(rgba)
  const header = new DataView(found[0]!.data.buffer, found[0]!.data.byteOffset)
  const width = header.getUint32(0)
  const height = header.getUint32(4)
  const [depth, color, , , interlace] = found[0]!.data.subarray(8)
  if (depth !== 8 || color !== 6 || interlace !== 0) throw new Error(`Unexpected PNG layout: depth ${depth}, color ${color}, interlace ${interlace}`)
  const zlib = joined(found.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data))
  return { width, height, rgba: unfilter(Bun.inflateSync(zlib.subarray(2, -4)), width, height) }
}

const bitmap = ({ width, height, rgba }: Raster) => {
  const stride = Math.ceil((width * 3) / 4) * 4
  const header = 54
  const bmp = new Uint8Array(header + stride * height)
  const view = new DataView(bmp.buffer)
  bmp.set([0x42, 0x4d])
  view.setUint32(2, bmp.length, true)
  view.setUint32(10, header, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, -height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, stride * height, true)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4
      const to = header + y * stride + x * 3
      bmp[to] = rgba[from + 2]!
      bmp[to + 1] = rgba[from + 1]!
      bmp[to + 2] = rgba[from]!
    }
  return bmp
}

export const encode = (raster: Raster, width = raster.width, height = raster.height) =>
  new Bun.Image(bitmap(raster)).resize(width, height).png().bytes()

export const crop = (raster: Raster, left: number, top: number, width: number, height: number): Raster => {
  const rgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const from = ((top + y) * raster.width + left) * 4
    rgba.set(raster.rgba.subarray(from, from + width * 4), y * width * 4)
  }
  return { width, height, rgba }
}
