import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { fontOf } from './font'
import { specimen } from './specimen'

export default definePlugin({
  name: 'file-fonts-web',
  description: 'Shows font files in the file viewer as a specimen, loaded with the FontFace API',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'font',
        extensions: formatAddons['file-fonts'].extensions,
        render: async file => specimen(ctx.kit, await fontOf(file)),
      }),
    )
  },
})
