import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'file-sqlite-web',
  description: 'Opens SQLite databases in the file viewer: their tables and views, and each table a page of rows at a time',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'sqlite',
        extensions: formatAddons['file-sqlite'].extensions,
        render: async file => (await import('./view')).databaseView({ kit: ctx.kit, file }),
      }),
    )
  },
})
