import type { ImageBlock } from '@sand/messages'
import type { AttachmentLimits } from './contract'

interface Encoding {
  mediaType: string
  encode(image: Bun.Image): Bun.Image
}

const sendable = new Set(['png', 'jpeg', 'webp', 'gif'])

export const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'avif'])

const png: Encoding = { mediaType: 'image/png', encode: image => image.png() }

const jpeg = (quality: number): Encoding => ({ mediaType: 'image/jpeg', encode: image => image.jpeg({ quality }) })

const unknownFormat = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ERR_IMAGE_UNKNOWN_FORMAT'

const metadata = async (data: Uint8Array) => {
  try {
    return await new Bun.Image(data).metadata()
  } catch (error) {
    if (unknownFormat(error)) return undefined
    throw error
  }
}

const shrink = async (data: Uint8Array, format: string, name: string, { imageEdge, imageBytes }: AttachmentLimits): Promise<ImageBlock> => {
  for (const { mediaType, encode } of [...(format === 'png' ? [png] : []), jpeg(85), jpeg(70)]) {
    const resized = new Bun.Image(data).resize(imageEdge, imageEdge, { fit: 'inside', withoutEnlargement: true })
    const bytes = await encode(resized).bytes()
    if (bytes.length <= imageBytes) return { type: 'image', mediaType, data: bytes.toBase64(), name }
  }
  throw new Error(`${name} is still too large after resizing`)
}

export const image = async (data: Uint8Array, name: string, limits: AttachmentLimits): Promise<ImageBlock | undefined> => {
  const found = await metadata(data)
  if (!found) return undefined
  const { width, height, format } = found
  if (sendable.has(format) && Math.max(width, height) <= limits.imageEdge && data.length <= limits.imageBytes) {
    return { type: 'image', mediaType: `image/${format}`, data: data.toBase64(), name }
  }
  return shrink(data, format, name, limits)
}
