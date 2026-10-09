import type { ImageBlock } from '@sand/protocol'

export interface ImageLimits {
  edge: number
  bytes: number
}

const sendable = new Set(['png', 'jpeg', 'webp', 'gif'])

export const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'avif'])

const base64 = (data: Uint8Array) => Buffer.from(data).toString('base64')

export const normalizeImage = async (data: Uint8Array, name: string, limits: ImageLimits): Promise<ImageBlock> => {
  const { width, height, format } = await new Bun.Image(data).metadata()
  if (sendable.has(format) && Math.max(width, height) <= limits.edge && data.length <= limits.bytes) {
    return { type: 'image', mediaType: `image/${format}`, data: base64(data), name }
  }
  const resized = () => new Bun.Image(data).resize(limits.edge, limits.edge, { fit: 'inside', withoutEnlargement: true })
  const attempts: [string, () => Bun.Image][] = [
    ...(format === 'png' ? [['image/png', () => resized().png()] as [string, () => Bun.Image]] : []),
    ['image/jpeg', () => resized().jpeg({ quality: 85 })],
    ['image/jpeg', () => resized().jpeg({ quality: 70 })],
  ]
  for (const [mediaType, encode] of attempts) {
    const bytes = await encode().bytes()
    if (bytes.length <= limits.bytes) return { type: 'image', mediaType, data: base64(bytes), name }
  }
  throw new Error(`${name} is still too large after resizing`)
}
