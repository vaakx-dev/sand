import { decode, decodeImage, type IFD, toRGBA8 } from 'utif2'
import { type Decoding, MAX_RAW_BYTES, sizeProblem } from './picture'

interface Layout {
  width: number
  height: number
  pages: number
}

interface Pieces {
  offsets: number[]
  lengths: number[]
  pieceBytes: number
  imageBytes: number
}

const VALUE_BYTES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4]
const VIEW_TYPES = new Set([1, 2, 7])
const ARRAY_VALUE_BYTES = 16
const TAG = {
  width: 256,
  height: 257,
  bitsPerSample: 258,
  compression: 259,
  stripOffsets: 273,
  samplesPerPixel: 277,
  rowsPerStrip: 278,
  stripByteCounts: 279,
  tileWidth: 322,
  tileHeight: 323,
  tileOffsets: 324,
  tileByteCounts: 325,
  subDirectories: 330,
  exif: 34665,
  gps: 34853,
  dngPrivateData: 50740,
  fuji: 61440,
}
const POINTER_TAGS = new Set([TAG.subDirectories, TAG.exif, TAG.gps, TAG.fuji])
const POINTER_TYPES = new Set([3, 4, 13])
const HEADER_BYTES = 8
const ENTRY_BYTES = 12
const MAX_DIRECTORIES = 1024
const MAX_ENTRIES = 16_384
const MAX_DEPTH = 4
const MAX_TAG_BYTES = 64 * 1024 * 1024
const DEFLATE = new Set([8, 32946])
const ZLIB_HEADER_BYTES = 2
const ZLIB_TRAILER_BYTES = 4
const DAMAGED = 'its TIFF structure is damaged'
const TOO_MUCH = 'it holds more image data than the viewer opens'
const PARSE = { parseMN: false, debug: false }

class Structure {
  readonly #view: DataView
  readonly #little: boolean
  readonly #seen = new Set<number>()
  #entries = 0
  #tagBytes = 0
  pages = 0

  constructor(bytes: Uint8Array) {
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.#little = bytes[0] === 0x49
  }

  u16(at: number) {
    return this.#view.getUint16(at, this.#little)
  }

  u32(at: number) {
    return this.#view.getUint32(at, this.#little)
  }

  chain(first: number) {
    for (let offset = first; offset !== 0; offset = this.u32(offset + 2 + this.u16(offset) * ENTRY_BYTES)) {
      const problem = this.directory(offset, 0)
      if (problem) return problem
      this.pages += 1
    }
    return undefined
  }

  directory(offset: number, depth: number): string | undefined {
    if (depth > MAX_DEPTH || this.#seen.has(offset) || offset < HEADER_BYTES || offset + 2 > this.#view.byteLength) return DAMAGED
    this.#seen.add(offset)
    const count = this.u16(offset)
    this.#entries += count
    if (this.#seen.size > MAX_DIRECTORIES || this.#entries > MAX_ENTRIES) return TOO_MUCH
    if (offset + 2 + count * ENTRY_BYTES + 4 > this.#view.byteLength) return DAMAGED
    for (let index = 0; index < count; index++) {
      const problem = this.#entry(offset + 2 + index * ENTRY_BYTES, depth)
      if (problem) return problem
    }
    return undefined
  }

  dimension(directory: number, tag: number) {
    const entries = Array.from({ length: this.u16(directory) }, (_, index) => directory + 2 + index * ENTRY_BYTES)
    const entry = entries.find(at => this.u16(at) === tag)
    if (entry === undefined) return 0
    return this.u16(entry + 2) === 3 ? this.u16(entry + 8) : this.u32(entry + 8)
  }

  #entry(at: number, depth: number) {
    const tag = this.u16(at)
    const type = this.u16(at + 2)
    const count = this.u32(at + 4)
    const width = VALUE_BYTES[type] ?? 0
    if (!width) return undefined
    const length = count * width
    const start = length > 4 ? this.u32(at + 8) : at + 8
    this.#tagBytes += VIEW_TYPES.has(type) ? 0 : count * ARRAY_VALUE_BYTES
    if (this.#tagBytes > MAX_TAG_BYTES) return TOO_MUCH
    if (start + length > this.#view.byteLength || tag === TAG.dngPrivateData) return DAMAGED
    if (!POINTER_TAGS.has(tag)) return undefined
    if (!POINTER_TYPES.has(type)) return DAMAGED
    const pointers = Array.from({ length: count }, (_, index) => (width === 2 ? this.u16(start + index * 2) : this.u32(start + index * 4)))
    return pointers.map(pointer => this.directory(pointer, depth + 1)).find(Boolean)
  }
}

const isTiff = (bytes: Uint8Array) => {
  if (bytes.length < HEADER_BYTES) return false
  const order = String.fromCharCode(bytes[0]!, bytes[1]!)
  const magic = order === 'II' ? bytes[2]! | (bytes[3]! << 8) : (bytes[2]! << 8) | bytes[3]!
  return (order === 'II' || order === 'MM') && magic === 42
}

const layoutOf = (bytes: Uint8Array): Layout | { error: string } => {
  if (!isTiff(bytes)) return { error: "it isn't a TIFF image" }
  const structure = new Structure(bytes)
  const start = structure.u32(4)
  const problem = structure.chain(start)
  if (problem) return { error: problem }
  const width = structure.dimension(start, TAG.width)
  const height = structure.dimension(start, TAG.height)
  const tooLarge = sizeProblem(width, height)
  return tooLarge ? { error: tooLarge } : { width, height, pages: structure.pages }
}

const values = (ifd: IFD, tag: number) => {
  const value = ifd[`t${tag}`]
  return Array.isArray(value) ? value.filter(item => typeof item === 'number') : []
}

const valueOf = (ifd: IFD, tag: number, fallback: number) => values(ifd, tag)[0] ?? fallback

const piecesOf = (ifd: IFD, { width, height }: Layout): Pieces => {
  const bitsPerPixel = valueOf(ifd, TAG.bitsPerSample, 1) * valueOf(ifd, TAG.samplesPerPixel, 1)
  const rowBytes = (pixels: number) => Math.ceil((pixels * bitsPerPixel) / 8)
  const imageBytes = rowBytes(width) * height
  const tileWidth = valueOf(ifd, TAG.tileWidth, 0)
  if (tileWidth) {
    const pieceBytes = rowBytes(tileWidth) * valueOf(ifd, TAG.tileHeight, 0)
    return { offsets: values(ifd, TAG.tileOffsets), lengths: values(ifd, TAG.tileByteCounts), pieceBytes, imageBytes }
  }
  const pieceBytes = rowBytes(width) * Math.min(valueOf(ifd, TAG.rowsPerStrip, height), height)
  return { offsets: values(ifd, TAG.stripOffsets), lengths: values(ifd, TAG.stripByteCounts), pieceBytes, imageBytes }
}

const piecesProblem = (bytes: Uint8Array, { offsets, lengths, pieceBytes, imageBytes }: Pieces) => {
  if (!offsets.length || offsets.length !== lengths.length) return DAMAGED
  if (offsets.some((offset, index) => offset + lengths[index]! > bytes.length)) return DAMAGED
  if (imageBytes > MAX_RAW_BYTES || offsets.length * pieceBytes > MAX_RAW_BYTES) return TOO_MUCH
  return undefined
}

const inflatedBytes = async (deflated: Uint8Array<ArrayBuffer>, limit: number) => {
  const reader = new Blob([deflated]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  let total = 0
  const count = async () => {
    for (let chunk = await reader.read(); !chunk.done && total <= limit; chunk = await reader.read()) total += chunk.value.length
  }
  await count().catch(() => undefined)
  void reader.cancel().catch(() => undefined)
  return total
}

const inflatedProblem = async (bytes: Uint8Array<ArrayBuffer>, ifd: IFD, { offsets, lengths, pieceBytes }: Pieces) => {
  if (!DEFLATE.has(valueOf(ifd, TAG.compression, 1))) return undefined
  for (const [index, offset] of offsets.entries()) {
    const deflated = bytes.subarray(offset + ZLIB_HEADER_BYTES, offset + lengths[index]! - ZLIB_TRAILER_BYTES)
    if ((await inflatedBytes(deflated, pieceBytes)) > pieceBytes) return TOO_MUCH
  }
  return undefined
}

const decodeTiff = async (buffer: ArrayBuffer): Promise<Decoding> => {
  const bytes = new Uint8Array(buffer)
  const layout = layoutOf(bytes)
  if ('error' in layout) return layout
  const [image] = decode(buffer, PARSE)
  if (!image) return { error: DAMAGED }
  const pieces = piecesOf(image, layout)
  const problem = piecesProblem(bytes, pieces) ?? (await inflatedProblem(bytes, image, pieces))
  if (problem) return { error: problem }
  decodeImage(buffer, image)
  const rgba = new Uint8ClampedArray(toRGBA8(image))
  return { picture: { width: image.width, height: image.height, pages: layout.pages, rgba } }
}

export { decodeTiff }
