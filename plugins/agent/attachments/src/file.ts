import type { UserContent } from '@sand/chats/contract'
import type { AttachmentLimits } from './contract'
import { basename, extname } from 'node:path'
import { pdf, text } from './document'
import { image, imageExtensions } from './image'

const looksLikeImage = (extension: string, mediaType?: string) =>
  (mediaType?.startsWith('image/') && mediaType !== 'image/svg+xml') || imageExtensions.has(extension)

const looksLikePdf = (data: Uint8Array, extension: string) =>
  extension === 'pdf' || (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46)

export const isMedia = (path: string) => imageExtensions.has(extname(path).slice(1).toLowerCase()) || extname(path).toLowerCase() === '.pdf'

export const fromBytes = async (data: Uint8Array, name: string, limits: AttachmentLimits): Promise<UserContent> => {
  const mediaType = Bun.file(name).type.split(';')[0]
  const extension = extname(name).slice(1).toLowerCase()
  const picture = looksLikeImage(extension, mediaType) ? await image(data, name, limits) : undefined
  if (picture) return picture
  if (looksLikePdf(data, extension)) return pdf(data, name)
  const document = text(data, name)
  if (document) return document
  throw new Error(`Can't attach ${name}: only images, PDFs and text files are supported`)
}

export const fromFile = async (path: string, limits: AttachmentLimits): Promise<UserContent> => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return fromBytes(await file.bytes(), basename(path), limits)
}
