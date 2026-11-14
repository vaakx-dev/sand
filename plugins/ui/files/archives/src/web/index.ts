import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'file-archives-web',
  description: 'Opens zip, jar, tar and gzip archives in the file viewer: browse their folders and open the files inside',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'archive',
        extensions: formatAddons['file-archives'].extensions,
        render: async file => (await import('./view')).archiveView({ kit: ctx.kit, viewer: ctx.fileViewer, file }),
      }),
    )
  },
})
