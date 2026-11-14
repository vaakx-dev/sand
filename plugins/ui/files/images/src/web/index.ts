import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { decoded } from './decode'
import { pictureView } from './view'

export default definePlugin({
  name: 'file-images-web',
  description: 'Shows TIFF and HEIC images in the file viewer, decoded off the main thread',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'decoded-image',
        extensions: formatAddons['file-images'].extensions,
        render: async file => pictureView({ kit: ctx.kit, viewer: ctx.fileViewer }, file.name, await decoded(file)),
      }),
    )
  },
})
