import { cli } from '@sand/config/contract'
import { toolContent, turnContent } from '@sand/engine/contract'
import { media } from '@sand/media/contract'
import { server } from '@sand/server/contract'
import { transfers } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { attachments, attachmentsAdd, helloAttachments, type AttachmentLimits } from './contract'
import { fromBytes, fromFile, isMedia } from './file'
import type { ImageLimits } from './image'
import { labelImages } from './label'
import { fitImages } from './refit'
import { addAttachment, type UploadPlace } from './upload/store'

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
    ctx.on(turnContent, content => labelImages(ctx.media, content))
    ctx.on(toolContent, content => fitImages(ctx.media, content, images))
    const place: UploadPlace = { transfers: ctx.transfers, media: ctx.media, uploads: join(ctx.cli.home, 'uploads'), images, ...limits }
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloAttachments, () => limits),
            found.handle(attachmentsAdd, added => addAttachment(place, added)),
          )
        : undefined,
    )
  },
})
