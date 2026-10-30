import type { Media } from '@sand/media/contract'
import { isRecord } from '@sand/util'

interface CarriedMedia {
  mediaType: string
  data: string
}

export type Carried = Record<string, CarriedMedia>

const isCarried = (value: unknown): value is CarriedMedia => isRecord(value) && typeof value.mediaType === 'string' && typeof value.data === 'string'

const bytesOf = ({ mediaType, data }: CarriedMedia) => (mediaType.startsWith('text/') ? new TextEncoder().encode(data) : Uint8Array.fromBase64(data))

export const keepCarried = (media: Media, carried: unknown) => {
  if (!isRecord(carried)) return
  for (const item of Object.values(carried)) if (isCarried(item)) media.put(bytesOf(item), item.mediaType)
}
