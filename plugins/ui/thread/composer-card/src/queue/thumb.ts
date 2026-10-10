import type { ImageBlock, Prompt } from '@sand/messages'
import { img } from '@sand/dom'
import type { Context } from 'drydock'
import { preview } from '../attachments/content'

const imageOf = (prompt: Prompt) => (typeof prompt === 'string' ? undefined : prompt.find((block): block is ImageBlock => block.type === 'image'))

export const queueThumb = (ctx: Context<'threads'>, prompt: Prompt) => {
  const image = img({ class: 'h-4 w-4 shrink-0 rounded-sm', style: { objectFit: 'cover' }, alt: '' })
  const block = imageOf(prompt)
  if (!block) return image
  if (ctx.media) return ctx.media.show(image, block, ctx.threads.current()?.id)
  image.src = preview(block) ?? ''
  return image
}
