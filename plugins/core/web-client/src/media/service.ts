import type { ImageBlock, UserContent } from '@sand/chats/contract'
import type { Context } from 'drydock'
import { type Machines, machinesChange, type Media, type Wire } from '../contract'
import { intersectionObserver, listen } from '@vaakx-dev/vrui'
import { base64Of } from '../integrations/base64'
import type { Store } from '../threads/store'

const nearView = '800px'

const skeleton = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const blobPath = (hash: string, session?: string) => `/blob?${new URLSearchParams(session ? { hash, session } : { hash })}`

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

  const fetchBlob = async (hash: string, thread?: string) => {
    const device = thread ? store.deviceOf(thread) : store.here()
    await online(device)
    const response = await wire.fetch(blobPath(hash, thread), undefined, device)
    if (!response.ok) throw new Error(`Couldn't load an attachment (${response.status})`)
    return response.blob()
  }

  const load = async (image: HTMLImageElement, hash: string, thread?: string) => {
    const url = URL.createObjectURL(await fetchBlob(hash, thread))
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
    show(image, block, thread) {
      image.decoding = 'async'
      image.loading = 'lazy'
      if (typeof block.data === 'string') {
        image.src = dataUrl(block)
        return image
      }
      image.src = skeleton
      whenNearView(image, () => void load(image, block.blob, thread).catch(() => broken(image)))
      return image
    },
    inline: (content, thread) => Promise.all(content.map(block => restore(block, thread))),
  }
}
