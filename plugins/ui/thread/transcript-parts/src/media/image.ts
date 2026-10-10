import type { ImageBlock, MediaRef } from '@sand/messages'
import { img } from '@sand/dom'
import type { Context } from 'drydock'
import type { ImageOptions } from '../contract'

const fit = (block: ImageBlock, maxHeight?: number) => {
  const { width, height } = block as ImageBlock & Partial<MediaRef>
  if (!width || !height) return {}
  const limits = [`${width}px`, '100%', ...(maxHeight ? [`${Math.floor((maxHeight * width) / height)}px`] : [])]
  return { width, height, style: { width: `min(${limits.join(', ')})`, height: 'auto' } }
}

const inline = (image: HTMLImageElement, block: ImageBlock) => {
  if (typeof block.data === 'string') image.src = `data:${block.mediaType};base64,${block.data}`
  return image
}

export const mediaImage =
  (ctx: Context) =>
  (block: ImageBlock, thread: string | undefined, { maxHeight, ...props }: ImageOptions = {}) => {
    const image = img({ alt: block.name ?? 'image', ...props, ...fit(block, maxHeight) })
    return ctx.media ? ctx.media.show(image, block, thread) : inline(image, block)
  }
