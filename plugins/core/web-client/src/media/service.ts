import type { ImageBlock, UserContent } from '@sand/chats/contract'
import type { Context } from 'drydock'
import { type Machines, machinesChange, type Media, type Wire } from '../contract'
import { intersectionObserver, listen } from '@vaakx-dev/vrui'
import { base64Of } from '../integrations/base64'
import type { Store } from '../threads/store'
import { pixelHeight, placeholder, reserve } from './size'

const nearView = '800px'

const skeleton = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const blobPath = (hash: string, session?: string, height?: number) =>
  `/blob?${new URLSearchParams({ hash, ...(session ? { session } : {}), ...(height ? { h: String(height) } : {}) })}`

const dataUrl = (block: ImageBlock) => `data:${block.mediaType};base64,${block.data}`

const whenNearView = (element: Element, run: () => void) => {
  const observer = intersectionObserver(
    element,
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      run()
    },
    { rootMargin: nearView, scrollMargin: nearView },
  )
}

const broken = (image: HTMLImageElement) => {
  image.src = ''
  image.title ||= "This image couldn't be loaded"
}

export const createMedia = (ctx: Context, wire: Wire, store: Store, machines: Machines): Media => {
  const online = (device: string) =>
    new Promise<void>(resolve => {
      if (machines.online(device)) return resolve()
      const stop = ctx.on(machinesChange, () => {
        if (!machines.online(device)) return
        stop()
        resolve()
      })
    })

  const fetchBlob = async (hash: string, thread?: string, height?: number) => {
    const device = thread ? store.deviceOf(thread) : store.here()
    await online(device)
    const response = await wire.fetch(blobPath(hash, thread, height), undefined, device)
    if (!response.ok) throw new Error(`Couldn't load an attachment (${response.status})`)
    return response.blob()
  }

  const load = async (image: HTMLImageElement, hash: string, thread?: string, height?: number) => {
    const url = URL.createObjectURL(await fetchBlob(hash, thread, height))
    const release = () => URL.revokeObjectURL(url)
    listen(image, 'load', release, { once: true })
    listen(image, 'error', release, { once: true })
    image.src = url
  }

  const restore = async (block: UserContent, thread?: string): Promise<UserContent> => {
    if (block.type === 'text' || block.type === 'file' || typeof block.data === 'string') return block
    const { blob: hash, size, width, height, ...rest } = block
    const blob = await fetchBlob(hash, thread)
    const data = block.mediaType.startsWith('text/') ? await blob.text() : await base64Of(blob)
    return { ...rest, data }
  }

  return {
    show(image, block, thread, options) {
      image.decoding = 'async'
      if (typeof block.data === 'string') {
        image.loading = 'lazy'
        image.src = dataUrl(block)
        return image
      }
      reserve(image, block)
      image.src = placeholder(block) ?? skeleton
      const height = pixelHeight(block, options?.maxHeight)
      whenNearView(image, () => void load(image, block.blob, thread, height).catch(() => broken(image)))
      return image
    },
    inline: (content, thread) => Promise.all(content.map(block => restore(block, thread))),
  }
}
