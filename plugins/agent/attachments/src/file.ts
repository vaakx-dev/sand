import type { UserContent } from '@sand/messages'
import type { AttachmentLimits } from './contract'
import { basename, extname } from 'node:path'
import { pdf, text } from './document'
import { image, imageExtensions } from './image'

const looksLikeImage = (extension: string, mediaType?: string) =>
  (mediaType?.startsWith('image/') && mediaType !== 'image/svg+xml') || imageExtensions.has(extension)

export const fromFile = async (path: string, limits: AttachmentLimits): Promise<UserContent> => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  const name = basename(path)
  const data = await file.bytes()
  const mediaType = file.type.split(';')[0]
  const extension = extname(name).slice(1).toLowerCase()
  const picture = looksLikeImage(extension, mediaType) ? await image(data, name, limits) : undefined
  if (picture) return picture
  if (mediaType === 'application/pdf' || extension === 'pdf') return pdf(data, name)
  const document = text(data, name)
  if (document) return document
  throw new Error(`Can't attach ${name}: only images, PDFs and text files are supported`)
}
