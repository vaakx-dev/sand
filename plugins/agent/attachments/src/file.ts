import type { DocumentBlock, ImageBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import type { Fitted } from './fitted'
import { basename, extname } from 'node:path'
import { maxPdfBytes, pdf, text } from './document'
import { image, imageExtensions, type ImageLimits } from './image'

const extensionOf = (name: string) => extname(name).slice(1).toLowerCase()

const looksLikeImage = (name: string) => {
  const mediaType = Bun.file(name).type.split(';')[0]
  return (mediaType?.startsWith('image/') && mediaType !== 'image/svg+xml') || imageExtensions.has(extensionOf(name))
}

const looksLikePdf = (data: Uint8Array, name: string) =>
  extensionOf(name) === 'pdf' || (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46)

export const isMedia = (path: string) => imageExtensions.has(extensionOf(path)) || extensionOf(path) === 'pdf'

export const worthFitting = (name: string, size: number) => size <= maxPdfBytes || looksLikeImage(name)

export const fit = async (data: Uint8Array, name: string, limits: ImageLimits): Promise<Fitted | undefined> => {
  const picture = looksLikeImage(name) ? await image(data, name, limits) : undefined
  if (picture) return picture
  if (looksLikePdf(data, name)) return pdf(data, name)
  return text(data, name)
}

export const stored = (media: Media, { bytes, block }: Fitted): ImageBlock | DocumentBlock => ({ ...media.put(bytes, block.mediaType), ...block })

export const fromBytes = async (media: Media, data: Uint8Array, name: string, limits: ImageLimits) => {
  const fitted = await fit(data, name, limits)
  if (!fitted) throw new Error(`Can't attach ${name}: only images, PDFs and text files are supported`)
  return stored(media, fitted)
}

export const fromFile = async (media: Media, path: string, limits: ImageLimits) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return fromBytes(media, await file.bytes(), basename(path), limits)
}
