import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { dynamicChild, img, span } from '@vaakx-dev/vrui'
import type { ReplyImages } from '../../contract'
import { imagePath } from '../../path'
import type { ImagesContext } from '../context'
import { imageCache, type CachedImage, type Outcome } from './cache'
import { decodedImage } from './integrations/object-url'
import { onceNearView } from './near'
import { imageSizes, type Size } from './sizes'

const scheme = /^[a-z][\w+.-]+:/i

const onDisk = (src: string) => src.startsWith('file:') || !scheme.test(src)

const boxOf = (size: () => Size | undefined) => ({
  width: () => {
    const known = size()
    return known && `min(100%, ${known.width}px, calc(20rem * ${known.width} / ${known.height}))`
  },
  aspectRatio: () => {
    const known = size()
    return known && `${known.width} / ${known.height}`
  },
})

const view = (kit: Kit, alt: string, outcome: Outcome | undefined, retry: () => void) => {
  if (!outcome) return kit.loadingState({ flush: true })
  if ('src' in outcome) return img({ class: 'block h-full w-full rounded-md', alt, src: outcome.src, decoding: 'async' })
  return kit.errorState({ flush: true, text: outcome.error, retry })
}

const replyImage = (kit: Kit, image: CachedImage, saved: Size | undefined, alt: string) => {
  const size = () => {
    const outcome = image.state.get()
    if (!outcome) return saved
    return 'src' in outcome ? outcome : undefined
  }
  return span(
    { class: 'block', style: boxOf(size), ref: box => onceNearView(box, image.start) },
    dynamicChild(image.state, outcome => view(kit, alt, outcome, image.reload)),
  )
}

export const createReplyImages = (ctx: ImagesContext): ReplyImages => {
  const { kit, wire, threads } = ctx
  const cache = imageCache()
  const sizes = imageSizes()
  ctx.effect(() => () => cache.clear())

  const fetchImage = async (thread: string, src: string, at: number): Promise<Outcome> => {
    const path = `${imagePath}?${new URLSearchParams({ src, session: thread, before: String(at) })}`
    const response = await wire.fetch(path, undefined, threads.get(thread)?.device)
    if (!response.ok) return { error: `Couldn't load ${src} (${response.status})` }
    const image = await decodedImage(await response.blob())
    sizes.set(`${thread} ${src}`, image)
    return image
  }

  return {
    forReply: (thread, at) => (src, alt) => {
      if (!onDisk(src)) return undefined
      const image = cache.get(`${thread} ${at} ${src}`, () =>
        fetchImage(thread, src, at).catch(error => ({ error: `Couldn't load ${src}: ${errorMessage(error)}` })),
      )
      return kit.ownedByNode(() => replyImage(kit, image, sizes.get(`${thread} ${src}`), alt))
    },
  }
}
