import type { ImageBlock, MediaRef, UserContent } from '@sand/messages'
import type { Media, Wire } from '../contract'
import type { Store } from '../threads/store'
import { createVisibility } from './visible'

type Stored = Partial<MediaRef> & { data?: string }

const blobPath = (hash: string, session?: string) => `/blob?${new URLSearchParams(session ? { hash, session } : { hash })}`

const dataUrl = (block: ImageBlock) => `data:${block.mediaType};base64,${block.data}`

const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const createMedia = (wire: Wire, store: Store) => {
  const visibility = createVisibility()

  const fetchBlob = async (hash: string, thread?: string) => {
    const device = thread ? store.threads.get(thread)?.device : undefined
    const response = await wire.fetch(blobPath(hash, thread), undefined, device)
    if (!response.ok) throw new Error(`Could not load an attachment (${response.status})`)
    return response.blob()
  }

  const load = async (image: HTMLImageElement, hash: string, thread?: string) => {
    const url = URL.createObjectURL(await fetchBlob(hash, thread))
    const release = () => URL.revokeObjectURL(url)
    image.addEventListener('load', release, { once: true })
    image.addEventListener('error', release, { once: true })
    image.src = url
  }

  const restore = async (block: UserContent, thread?: string): Promise<UserContent> => {
    const { blob: hash, size, width, height, ...rest } = block as UserContent & Stored
    if (block.type === 'text' || typeof rest.data === 'string' || !hash) return block
    const blob = await fetchBlob(hash, thread)
    const data = block.mediaType.startsWith('text/') ? await blob.text() : await base64(blob)
    return { ...rest, data } as UserContent
  }

  const media: Media = {
    show(image, block, thread) {
      image.decoding = 'async'
      image.loading = 'lazy'
      const hash = (block as ImageBlock & Stored).blob
      if (typeof block.data === 'string') image.src = dataUrl(block)
      else if (hash) visibility.when(image, () => void load(image, hash, thread).catch(() => void (image.title ||= 'This image could not be loaded')))
      return image
    },
    inline: (content, thread) => Promise.all(content.map(block => restore(block, thread))),
  }

  return { media, dispose: visibility.dispose }
}
