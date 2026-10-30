import { errorMessage } from '@sand/util'
import type { Threads, Wire } from '@sand/web-client/contract'
import { mediaSign, type SignItem, type Signed, type StoredMedia } from '../contract'
import type { ImageSource } from './contract'

export interface Link {
  src: string
  expires: number
  media?: StoredMedia
}

interface Batch {
  device?: string
  session?: string
  items: SignItem[]
  settles: ((signed: Signed) => void)[]
}

const renewEarly = 300_000

const itemOf = (source: ImageSource): SignItem =>
  'src' in source ? { src: source.src } : { hash: source.block.hash, mediaType: source.block.mediaType, name: source.block.name }

export const createSigner = (wire: Wire, threads: Threads) => {
  const links = new Map<string, Link>()
  const flying = new Map<string, Promise<Link>>()
  const batches = new Map<string, Batch>()

  const placeOf = (thread?: string) => ({ device: thread ? threads.get(thread)?.device : undefined, session: thread })

  const keyOf = (item: SignItem, thread?: string) => {
    const { device = '' } = placeOf(thread)
    return 'src' in item ? `${device} ${thread ?? ''} ${item.src}` : `${device} ${item.hash} ${item.name ?? ''}`
  }

  const flush = (key: string) => {
    const batch = batches.get(key)
    if (!batch) return
    batches.delete(key)
    void wire.call(mediaSign, { session: batch.session, items: batch.items }, batch.device).then(
      results => batch.settles.forEach((settle, index) => settle(results[index] ?? { error: 'No link came back' })),
      error => batch.settles.forEach(settle => settle({ error: errorMessage(error) })),
    )
  }

  const request = (item: SignItem, thread?: string) =>
    new Promise<Signed>(settle => {
      const place = placeOf(thread)
      const key = `${place.device ?? ''} ${place.session ?? ''}`
      let batch = batches.get(key)
      if (!batch) {
        batch = { ...place, items: [], settles: [] }
        batches.set(key, batch)
        void Promise.resolve().then(() => flush(key))
      }
      batch.items.push(item)
      batch.settles.push(settle)
    })

  const linkOf = (signed: Signed, thread?: string): Link => {
    if ('error' in signed) throw new Error(signed.error)
    return { src: wire.url(signed.url, placeOf(thread).device), expires: signed.expires, media: signed.media }
  }

  const freshLink = (key: string) => {
    const link = links.get(key)
    if (link && Date.now() < link.expires - renewEarly) return link
    links.delete(key)
    return undefined
  }

  return {
    cached: (source: ImageSource, thread?: string) => freshLink(keyOf(itemOf(source), thread)),
    sign(source: ImageSource, thread?: string, again = false): Promise<Link> {
      const item = itemOf(source)
      if (!('src' in item) && !item.hash) return Promise.reject(new Error('This image was never stored'))
      const key = keyOf(item, thread)
      const known = again ? undefined : (freshLink(key) ?? flying.get(key))
      if (known) return Promise.resolve(known)
      links.delete(key)
      const signing = request(item, thread).then(signed => {
        const link = linkOf(signed, thread)
        links.set(key, link)
        return link
      })
      flying.set(key, signing)
      const land = () => {
        if (flying.get(key) === signing) flying.delete(key)
      }
      void signing.then(land, land)
      return signing
    },
  }
}

export type Signer = ReturnType<typeof createSigner>
