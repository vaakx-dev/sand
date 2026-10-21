import type { AttachmentLimits } from '@sand/attachments/contract'
import type { Prompt, UserContent } from '@sand/chats/contract'
import { imageLabel } from '@sand/chats/prompt'
import { fitImage } from '../integrations/resize'

const fallback: AttachmentLimits = {
  imageEdge: 2000,
  imageBytes: 3_750_000,
  pdfBytes: 20_000_000,
  textLength: 400_000,
  uploadBytes: 1024 ** 3,
}

const bytesPerChar = 4

export const pasteLimit = 32 * 1024

export const withFallback = (limits?: Partial<AttachmentLimits>): AttachmentLimits => ({ ...fallback, ...limits })

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

const sizeLabel = (bytes: number) => (bytes >= 1024 ** 3 ? `${Math.round(bytes / 1024 ** 3)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`)

const image = async (file: File, limits: AttachmentLimits): Promise<UserContent> => {
  const blob = await fitImage(file, { edge: limits.imageEdge, bytes: limits.imageBytes })
  return { type: 'image', mediaType: blob.type, data: toBase64(await blob.arrayBuffer()), name: file.name }
}

const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const text = async (file: File, limits: AttachmentLimits): Promise<UserContent | File> => {
  if (file.size > limits.textLength * bytesPerChar) return file
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.subarray(0, 8192).includes(0)) return file
  const decoded = new TextDecoder().decode(bytes)
  if (decoded.length > limits.textLength) return file
  return { type: 'document', mediaType: 'text/plain', data: decoded, name: file.name }
}

export const fromFile = async (file: File, limits: AttachmentLimits): Promise<UserContent | File> => {
  if (file.size > limits.uploadBytes) throw new Error(`Larger than ${sizeLabel(limits.uploadBytes)}`)
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') return image(file, limits).catch(() => file)
  if (!isPdf(file)) return text(file, limits)
  if (file.size > limits.pdfBytes) return file
  return { type: 'document', mediaType: 'application/pdf', data: toBase64(await file.arrayBuffer()), name: file.name }
}

export const fromPaste = (text: string): UserContent => ({ type: 'document', mediaType: 'text/plain', data: text, name: 'Pasted text.txt' })

export const compose = (text: string, items: UserContent[]): UserContent[] => {
  const parts = items.flatMap((item): UserContent[] =>
    item.type === 'image' ? [{ type: 'text', text: imageLabel(item) }, item] : [item],
  )
  return text.trim() ? [...parts, { type: 'text', text }] : parts
}

export const split = (prompt: Prompt): { text: string; items: UserContent[] } => {
  if (typeof prompt === 'string') return { text: prompt, items: [] }
  const items = prompt.filter((block): block is Exclude<UserContent, { type: 'text' }> => block.type !== 'text')
  const labels = new Set(items.flatMap(item => (item.type === 'image' ? [imageLabel(item)] : [])))
  const text = prompt.flatMap(block => (block.type === 'text' && !labels.has(block.text) ? [block.text] : [])).join('\n\n')
  return { text, items }
}

export const contentName = (item: UserContent) => ('name' in item && item.name) || item.type

export const preview = (item?: UserContent) => (item?.type === 'image' ? `data:${item.mediaType};base64,${item.data}` : undefined)
