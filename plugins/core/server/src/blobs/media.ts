import type { MediaRef } from '@sand/messages'

export interface Media {
  type: 'image' | 'document'
  mediaType: string
  data: string
  name?: string
}

export type Ref = Omit<Media, 'data'> & MediaRef

type Fields = Record<string, unknown>

const isBlock = (value: Fields) => (value.type === 'image' || value.type === 'document') && typeof value.mediaType === 'string'

export const isMedia = (value: Fields): value is Fields & Media => isBlock(value) && typeof value.data === 'string'

export const isRef = (value: Fields): value is Fields & Ref => isBlock(value) && typeof value.blob === 'string' && value.data === undefined

export const isText = (mediaType: string) => mediaType.startsWith('text/')

export const isPlain = (value: object): value is Fields => {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const bytesOf = ({ mediaType, data }: Media): Uint8Array =>
  isText(mediaType) ? new TextEncoder().encode(data) : Buffer.from(data, 'base64')

export const sizeOf = ({ mediaType, data }: Media) => {
  if (isText(mediaType)) return Buffer.byteLength(data, 'utf8')
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.floor((data.length * 3) / 4) - padding
}

export const rewrite = (value: unknown, change: (fields: Fields) => unknown): unknown => {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    let copy: unknown[] | undefined
    value.forEach((item, index) => {
      const next = rewrite(item, change)
      if (next === item) return
      copy ??= [...value]
      copy[index] = next
    })
    return copy ?? value
  }
  if (!isPlain(value)) return value
  const changed = change(value)
  if (changed !== value) return changed
  let copy: Fields | undefined
  for (const key in value) {
    const item = value[key]
    const next = rewrite(item, change)
    if (next === item) continue
    copy ??= { ...value }
    copy[key] = next
  }
  return copy ?? value
}
