import { fileViewer, formatAddons } from '@sand/file-viewer/contract'
import { markdownCode } from '@sand/markdown/contract'
import { kit } from '@sand/ui-kit/contract'
import { theme } from '@sand/ui-theme/contract'
import { div } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { Diagrams } from './diagrams'
import { diagramView } from './view'

export default definePlugin({
  name: 'mermaid',
  description: 'Draws mermaid code blocks in replies and .mmd files in the file viewer as diagrams, in the page theme',
  inject: { kit, code: markdownCode },
  apply(ctx) {
    const diagrams = new Diagrams()
    const view = (source: string) => diagramView({ kit: ctx.kit, diagrams }, source)
    ctx.watch(theme, found => diagrams.paint(found))
    ctx.effect(() => ctx.code.language({ language: 'mermaid', render: view }))
    ctx.watch(fileViewer, viewer =>
      viewer?.format({
        id: 'mermaid',
        extensions: formatAddons.mermaid.extensions,
        render: async file => div({ class: 'p-4' }, view(await file.content())),
      }),
    )
  },
})
