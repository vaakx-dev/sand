import type { AttachmentLimits } from './contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { maxPdfBytes, maxTextLength } from './document'
import { fromFile } from './file'
import { finishUpload } from './upload/store'

export default definePlugin({
  name: 'attachments',
  inject: ['cli', 'transfers'],
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
      uploadBytes: 1024 ** 3,
    }
    ctx.provide('attachments', { limits, fromFile: path => fromFile(path, limits) })
    const uploads = join(ctx.cli.home, 'uploads')
    ctx.watch('server', server =>
      server?.handle('attachments.finish', finished => finishUpload(ctx.transfers, uploads, limits.uploadBytes, finished)),
    )
  },
})
