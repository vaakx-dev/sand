import type { ImageBlock } from '@sand/chats/contract'
import { imageViewer } from '@sand/images/contract'
import { media } from '@sand/web-client/contract'
import { img } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import type { ImageOptions, MediaImage } from './contract'

const sizeOf = (block: ImageBlock) => {
  if (typeof block.data === 'string' || !block.width || !block.height) return undefined
  return { width: block.width, height: block.height }
}

const fit = (block: ImageBlock, { maxHeight, class: extra, ...props }: ImageOptions) => {
  const size = sizeOf(block)
  if (!size) return { ...props, class: extra }
  const limits = [`${size.width}px`, '100%', ...(maxHeight ? [`${Math.floor((maxHeight * size.width) / size.height)}px`] : [])]
  return { ...props, ...size, class: [extra, 'h-auto'], style: { width: `min(${limits.join(', ')})` } }
}

const inline = (image: HTMLImageElement, block: ImageBlock) => {
  if (typeof block.data === 'string') image.src = `data:${block.mediaType};base64,${block.data}`
  return image
}

const viewable = (ctx: ChatContext, block: ImageBlock, thread: string | undefined, options: ImageOptions) => {
  const viewer = ctx.get(imageViewer)
  if (!viewer || !thread) return fit(block, options)
  return { ...fit(block, { ...options, class: [options.class, 'cursor-zoom-in'] }), onClick: () => viewer.open(thread, block) }
}

export const mediaImage =
  (ctx: ChatContext): MediaImage =>
  (block, thread, options = {}) => {
    const image = img({ alt: block.name ?? 'image', ...viewable(ctx, block, thread, options) })
    const shown = ctx.get(media)
    return shown ? shown.show(image, block, thread) : inline(image, block)
  }
