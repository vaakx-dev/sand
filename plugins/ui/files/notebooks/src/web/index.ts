import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { markdown } from '@sand/markdown/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'file-notebooks-web',
  description: 'Shows Jupyter notebooks in the file viewer as cells with their saved outputs',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'notebook',
        extensions: formatAddons['file-notebooks'].extensions,
        render: async file => (await import('./view')).notebookView({ kit: ctx.kit, markdown: ctx.get(markdown) }, file),
      }),
    )
  },
})
