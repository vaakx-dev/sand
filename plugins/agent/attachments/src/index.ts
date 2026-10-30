import { cli } from '@sand/config/contract'
import { turnPrompt } from '@sand/loop/contract'
import { media } from '@sand/media/contract'
import { server } from '@sand/server/contract'
import { transfers } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { attachments, attachmentsFinish, helloAttachments, type AttachmentLimits } from './contract'
import { fromBytes, fromFile, isMedia } from './file'
import type { ImageLimits } from './image'
import { labelImages } from './label'
import { finishUpload, type UploadPlace } from './upload/store'

export default definePlugin({
  name: 'attachments',
  inject: { cli, transfers, media },
  config: z.object({
    max_image_edge: z.number().int().positive().default(2000),
    max_image_bytes: z.number().int().positive().default(3_750_000),
  }),
  apply(ctx, config) {
    const images: ImageLimits = { imageEdge: config.max_image_edge, imageBytes: config.max_image_bytes }
    const limits: AttachmentLimits = { uploadBytes: 1024 ** 3 }
    ctx.provide(attachments, {
      isMedia,
      fromFile: path => fromFile(ctx.media, path, images),
      fromBytes: (data, name) => fromBytes(ctx.media, data, name, images),
    })
    ctx.on(turnPrompt, content => labelImages(ctx.media, content))
    const place: UploadPlace = { transfers: ctx.transfers, media: ctx.media, uploads: join(ctx.cli.home, 'uploads'), images, ...limits }
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloAttachments, () => limits),
            found.handle(attachmentsFinish, finished => finishUpload(place, finished)),
          )
        : undefined,
    )
  },
})
