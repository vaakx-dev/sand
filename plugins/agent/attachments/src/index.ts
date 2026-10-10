import type { AttachmentLimits } from './contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { maxPdfBytes, maxTextLength } from './document'
import { fromFile } from './file'

export default definePlugin({
  name: 'attachments',
  config: z.object({
    max_image_edge: z.number().int().positive().default(2000),
    max_image_bytes: z.number().int().positive().default(3_750_000),
  }),
  apply(ctx, config) {
    const limits: AttachmentLimits = {
      imageEdge: config.max_image_edge,
      imageBytes: config.max_image_bytes,
      pdfBytes: maxPdfBytes,
      textLength: maxTextLength,
    }
    ctx.provide('attachments', { limits, fromFile: path => fromFile(path, limits) })
  },
})
