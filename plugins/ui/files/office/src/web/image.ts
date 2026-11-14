import { imageDimensions } from '@sand/util'

const MAX_PIXELS = 40_000_000

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
}

const SHOWN_TYPES = new Set(Object.values(TYPES))

const imageType = (path: string) => TYPES[path.split('.').pop()?.toLowerCase() ?? '']

const viewable = (bytes: Uint8Array, type: string) => {
  if (!SHOWN_TYPES.has(type)) return false
  if (type === TYPES.svg) return true
  const size = imageDimensions(bytes)
  return Boolean(size && size.width * size.height <= MAX_PIXELS)
}

export { imageType, viewable }
