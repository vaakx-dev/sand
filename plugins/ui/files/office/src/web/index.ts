import { extensionOf, fileViewer, formatAddons, type OpenFile } from '@sand/file-viewer/contract'
import { type Kit, kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'

type Reader = (file: OpenFile, kit: Kit) => Promise<HTMLElement>

const word = () => import('./word/document').then(module => module.wordDocument)
const sheets = () => import('./sheet/view').then(module => module.workbookView)
const slides = () => import('./slides/view').then(module => module.deckView)

const READERS: Record<string, () => Promise<Reader>> = { docx: word, xlsx: sheets, xlsm: sheets, pptx: slides }

export default definePlugin({
  name: 'file-office-web',
  description: 'Shows Word documents, Excel sheets and PowerPoint slides in the file viewer',
  inject: { fileViewer, kit },
  apply(ctx) {
    const render = async (file: OpenFile) => {
      const reader = READERS[extensionOf(file.name)]
      if (!reader) throw new Error('it isn’t a Word, Excel or PowerPoint file')
      return (await reader())(file, ctx.kit)
    }
    ctx.effect(() => ctx.fileViewer.format({ id: 'office', extensions: formatAddons['file-office'].extensions, render }))
  },
})
