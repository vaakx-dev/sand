import type { ImageBlock } from '@sand/chats/contract'
import { imageViewer } from '@sand/images/contract'
import type { MarkdownImage } from '@sand/markdown/contract'
import { mediaView, type ImageSource, type MediaView } from '@sand/media/web/contract'
import { dynamicChild, sig } from '@vaakx-dev/vrui'
import type { TranscriptContext } from './context'
import type { ImageOptions, MediaImage } from './contract'

const replyHeight = 320

export const chatImages = (ctx: TranscriptContext) => {
  const view = sig<MediaView | undefined>(undefined)
  ctx.watch(mediaView, found => view.set(found))
  const unshown = (name = 'image') => ctx.kit.metaLine(`▣ ${name}`)

  const show = (source: ImageSource, thread: string | undefined, name: string | undefined, options: ImageOptions) => {
    const open = thread ? (block: ImageBlock) => ctx.get(imageViewer)?.open(thread, block) : undefined
    return dynamicChild(view, found => (found ? found.image(source, thread, { ...options, open }) : unshown(name)))
  }

  const image: MediaImage = (block, thread, options = {}) => show({ block }, thread, block.name, options)

  const replyImage =
    (thread: string): MarkdownImage =>
    (src, alt) =>
      show({ src }, thread, alt || src, { alt, class: 'block max-w-full rounded-md', maxHeight: replyHeight })

  return { image, replyImage }
}

export type Images = ReturnType<typeof chatImages>
