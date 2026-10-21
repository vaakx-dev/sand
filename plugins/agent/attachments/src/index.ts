import { cli } from '@sand/config/contract'
import { server } from '@sand/server/contract'
import { transfers } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { attachments, attachmentsFinish, helloAttachments, type AttachmentLimits } from './contract'
import { maxPdfBytes, maxTextLength } from './document'
import { fromBytes, isMedia, fromFile } from './file'
import { finishUpload } from './upload/store'

export default definePlugin({
  name: 'attachments',
  inject: { cli, transfers },
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
    ctx.provide(attachments, { limits, isMedia, fromFile: path => fromFile(path, limits), fromBytes: (data, name) => fromBytes(data, name, limits) })
    const uploads = join(ctx.cli.home, 'uploads')
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloAttachments, () => limits),
            found.handle(attachmentsFinish, finished => finishUpload(ctx.transfers, uploads, limits.uploadBytes, finished)),
          )
        : undefined,
    )
  },
})
