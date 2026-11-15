import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'file-pdf-web',
  description: "Shows PDFs in the file viewer's File tab with pdf.js, drawing pages as they scroll near",
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'pdf',
        extensions: formatAddons['file-pdf'].extensions,
        render: async file => (await import('./reader')).reader(ctx.kit, file),
      }),
    )
  },
})
