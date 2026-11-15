import { extensionOf, fileViewer, formatAddons, type OpenFile } from '@sand/file-viewer/contract'
import { kit, type Kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

const documentView = async (kit: Kit, file: OpenFile) => {
  switch (extensionOf(file.name)) {
    case 'epub':
      return (await import('./epub/view')).epubView(kit, file)
    case 'rtf':
      return (await import('./rtf/view')).rtfView(kit, file)
    default:
      return (await import('./odf/view')).odfView(kit, file)
  }
}

export default definePlugin({
  name: 'file-documents-web',
  description: 'Shows OpenDocument text, spreadsheets and presentations, EPUB books and rich text files in the file viewer',
  inject: { fileViewer, kit },
  apply(ctx) {
    ctx.effect(() =>
      ctx.fileViewer.format({
        id: 'document',
        extensions: formatAddons['file-documents'].extensions,
        render: file => documentView(ctx.kit, file),
      }),
    )
  },
})
