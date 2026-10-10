import type { ImageBlock } from '@sand/messages'
import { img } from '@sand/dom'
import type { Context } from 'drydock'
import type { ImageOptions, MediaImage } from './contract'

const sizeOf = (block: ImageBlock) => {
  const width = 'width' in block ? Number(block.width) : 0
  const height = 'height' in block ? Number(block.height) : 0
  return width && height ? { width, height } : undefined
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

export const mediaImage =
  (ctx: Context): MediaImage =>
  (block, thread, options = {}) => {
    const image = img({ alt: block.name ?? 'image', ...fit(block, options) })
    return ctx.media ? ctx.media.show(image, block, thread) : inline(image, block)
  }
