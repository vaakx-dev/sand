import type { UserContent } from '@sand/messages'
import type { Attachments } from './contract'
import { definePlugin } from 'drydock'
import { basename, extname } from 'node:path'
import { z } from 'zod'
import { clipboardImage } from './clipboard'
import { maxPdfBytes, maxTextLength, pdf, text } from './document'
import { imageExtensions, normalizeImage } from './image'

const extension = (name: string) => extname(name).slice(1).toLowerCase()

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

export default definePlugin({
  name: 'attachments',
  config: z.object({
    max_image_edge: z.number().int().positive().default(2000),
    max_image_bytes: z.number().int().positive().default(3_750_000),
  }),
  apply(ctx, config) {
    const limits = { edge: config.max_image_edge, bytes: config.max_image_bytes }

    const fromBytes = async (name: string, data: Uint8Array, mediaType?: string): Promise<UserContent> => {
      const looksLikeImage = (mediaType?.startsWith('image/') && mediaType !== 'image/svg+xml') || imageExtensions.has(extension(name))
      if (looksLikeImage) {
        try {
          return await normalizeImage(data, name, limits)
        } catch (error) {
          if ((error as { code?: string }).code !== 'ERR_IMAGE_UNKNOWN_FORMAT') throw error
        }
      }
      if (mediaType === 'application/pdf' || extension(name) === 'pdf') return pdf(data, name)
      const document = text(data, name)
      if (document) return document
      throw new Error(`Can't attach ${name}: only images, PDFs and text files are supported`)
    }

    const attachments: Attachments = {
      limits: { imageEdge: limits.edge, imageBytes: limits.bytes, pdfBytes: maxPdfBytes, textLength: maxTextLength },
      fromBytes,
      async fromFile(path, name = basename(path)) {
        const file = Bun.file(path)
        if (!(await file.exists())) throw new Error(`File not found: ${path}`)
        return fromBytes(name, new Uint8Array(await file.arrayBuffer()), file.type.split(';')[0])
      },
      async fromClipboard() {
        const bytes = await clipboardImage()
        return bytes && normalizeImage(bytes, `clipboard-${stamp()}.png`, limits)
      },
      compose(prompt, items) {
        const parts = items.flatMap((item): UserContent[] =>
          item.type === 'image' ? [{ type: 'text', text: `${item.name ?? 'image'}:` }, item] : [item],
        )
        return prompt.trim() ? [...parts, { type: 'text', text: prompt }] : parts
      },
    }
    ctx.provide('attachments', attachments)
  },
})
