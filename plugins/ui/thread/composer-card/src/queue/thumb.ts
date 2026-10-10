import type { ImageBlock, Prompt } from '@sand/messages'
import { img } from '@sand/dom'
import type { Context } from 'drydock'
import { preview } from '../attachments/content'

export const imageOf = (prompt: Prompt) => (typeof prompt === 'string' ? undefined : prompt.find((block): block is ImageBlock => block.type === 'image'))

export const queueThumb = (ctx: Context<'threads'>, prompt: Prompt) => {
  const block = imageOf(prompt)
  const image = img({ class: 'h-4 w-4 shrink-0 rounded-sm', style: { objectFit: 'cover' }, alt: '', src: ctx.media ? undefined : preview(block) })
  return block && ctx.media ? ctx.media.show(image, block, ctx.threads.current()?.id) : image
}
