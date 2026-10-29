import { isMedia, isText, rewrite, type Media, type Ref } from './media'
import { unsigned } from './reasoning'
import { dimensions } from './sniff'
import type { BlobStore } from './store'

const threshold = 4096
const sniffed = 65_536

const hashOf = (data: string) => new Bun.CryptoHasher('sha256').update(data).digest('hex')

const bytesOf = ({ mediaType, data }: Media): Uint8Array => (isText(mediaType) ? new TextEncoder().encode(data) : Buffer.from(data, 'base64'))

const sizeOf = ({ mediaType, data }: Media) => {
  if (isText(mediaType)) return Buffer.byteLength(data, 'utf8')
  const padding = Number(data.endsWith('=')) + Number(data.endsWith('=='))
  return Math.floor((data.length * 3) / 4) - padding
}

const measure = (media: Media) => (media.type === 'image' ? dimensions(Buffer.from(media.data.slice(0, sniffed), 'base64')) : undefined)

export const createOutbound = (store: BlobStore) => {
  const refs = new WeakMap<object, Ref>()

  const created = (media: Media): Ref => {
    const { data, ...block } = media
    const ref: Ref = { ...block, blob: hashOf(data), size: sizeOf(media), ...measure(media) }
    refs.set(media, ref)
    return ref
  }

  const reference = (media: Media): Ref => {
    const ref = refs.get(media) ?? created(media)
    store.put(ref.blob, () => bytesOf(media))
    return ref
  }

  return (value: unknown) => rewrite(value, fields => (isMedia(fields) && fields.data.length >= threshold ? reference(fields) : unsigned(fields)))
}
