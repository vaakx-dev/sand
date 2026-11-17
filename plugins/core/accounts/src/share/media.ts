import type { Media } from '@sand/media/contract'
import { z } from 'zod'

interface CarriedMedia {
  mediaType: string
  data: string
}

export type Carried = Record<string, CarriedMedia>

const carriedSchema = z.record(z.string(), z.unknown())

const mediaSchema = z.object({ mediaType: z.string(), data: z.string() })

const bytesOf = ({ mediaType, data }: CarriedMedia) => (mediaType.startsWith('text/') ? new TextEncoder().encode(data) : Uint8Array.fromBase64(data))

export const keepCarried = (media: Media, carried: unknown) => {
  const items = carriedSchema.safeParse(carried).data ?? {}
  for (const item of Object.values(items)) {
    const found = mediaSchema.safeParse(item).data
    if (found) media.put(bytesOf(found), found.mediaType)
  }
}
