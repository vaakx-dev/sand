import type { AttachmentLimits } from '@sand/attachments/contract'
import type { UserContent } from '@sand/messages'
import { imageLabel } from '@sand/kit'
import { fitImage } from '../integrations/resize'

const fallback: AttachmentLimits = { imageEdge: 2000, imageBytes: 3_750_000, pdfBytes: 20_000_000, textLength: 400_000 }

export const pasteLimit = 32 * 1024

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

const megabytes = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`

const image = async (file: File, limits: AttachmentLimits): Promise<UserContent> => {
  const blob = await fitImage(file, { edge: limits.imageEdge, bytes: limits.imageBytes })
  return { type: 'image', mediaType: blob.type, data: toBase64(await blob.arrayBuffer()), name: file.name }
}

export const fromFile = async (file: File, limits = fallback): Promise<UserContent> => {
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') return image(file, limits)
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (file.size > limits.pdfBytes) throw new Error(`Larger than ${megabytes(limits.pdfBytes)}`)
    return { type: 'document', mediaType: 'application/pdf', data: toBase64(await file.arrayBuffer()), name: file.name }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.subarray(0, 8192).includes(0)) throw new Error('Only images, PDFs and text files')
  const text = new TextDecoder().decode(bytes)
  if (text.length > limits.textLength) throw new Error('Too long to attach')
  return { type: 'document', mediaType: 'text/plain', data: text, name: file.name }
}

export const fromPaste = (text: string): UserContent => ({ type: 'document', mediaType: 'text/plain', data: text, name: 'Pasted text.txt' })

export const compose = (text: string, items: UserContent[]): UserContent[] => {
  const parts = items.flatMap((item): UserContent[] =>
    item.type === 'image' ? [{ type: 'text', text: imageLabel(item) }, item] : [item],
  )
  return text.trim() ? [...parts, { type: 'text', text }] : parts
}

export const split = (prompt: string | UserContent[]) => {
  if (typeof prompt === 'string') return { text: prompt, items: [] as UserContent[] }
  const items = prompt.filter((block): block is Exclude<UserContent, { type: 'text' }> => block.type !== 'text')
  const labels = new Set(items.flatMap(item => (item.type === 'image' ? [imageLabel(item)] : [])))
  const text = prompt.flatMap(block => (block.type === 'text' && !labels.has(block.text) ? [block.text] : [])).join('\n\n')
  return { text, items }
}

export const contentName = (item: UserContent) => ('name' in item && item.name) || item.type

export const preview = (item: UserContent) => (item.type === 'image' ? `data:${item.mediaType};base64,${item.data}` : undefined)
