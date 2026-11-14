interface Picture {
  width: number
  height: number
  pages: number
  rgba: Uint8ClampedArray<ArrayBuffer>
}

type Decoding = { picture: Picture } | { error: string }

const MAX_FILE_BYTES = 200 * 1024 * 1024
const MAX_PIXELS = 50_000_000
const MAX_SIDE = 32_767
const MAX_RAW_BYTES = MAX_PIXELS * 8

const counted = (value: number) => value.toLocaleString('en')

const sizeProblem = (width: number, height: number) => {
  if (!(width > 0 && height > 0)) return "it doesn't say how large it is"
  if (width <= MAX_SIDE && height <= MAX_SIDE && width * height <= MAX_PIXELS) return undefined
  return `it is ${counted(width)} × ${counted(height)} pixels, and the viewer opens images up to ${MAX_PIXELS / 1_000_000} megapixels`
}

export { MAX_FILE_BYTES, MAX_RAW_BYTES, sizeProblem, type Decoding, type Picture }
