import { request, type } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export interface MediaRef {
  hash: string
  size: number
  width?: number
  height?: number
}

export interface StoredMedia extends MediaRef {
  mediaType: string
}

export interface Media {
  put(bytes: Uint8Array, mediaType: string): StoredMedia
  path(media: StoredMedia): string
  data(media: StoredMedia): string | undefined
  inUse(hashes: () => Iterable<string>): Dispose
}

export const media = service<Media>('media')

export const mediaPath = '/media/'

const stored = lazy(() => z.object({ hash: z.string(), mediaType: z.string(), name: z.string().optional() }))
const file = lazy(() => z.object({ src: z.string() }))

export type SignItem = z.infer<ReturnType<typeof stored>> | z.infer<ReturnType<typeof file>>

export type Signed = { url: string; expires: number; media?: StoredMedia } | { error: string }

export const mediaSign = request('media.sign', {
  input: () => z.object({ session: z.string().optional(), items: z.array(z.union([stored(), file()])) }),
  output: type<Signed[]>(),
})
