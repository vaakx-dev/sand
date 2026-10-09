import { definePlugin } from 'drydock'
import { globRenderer, grepRenderer } from './render'

export default definePlugin({
  name: 'view-grep',
  description: 'Shows grep matches grouped by file, and glob results as a file list',
  inject: ['toolViews'],
  uses: { transcript: 'does nothing: searches use the generic view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const added = [transcript.tool('grep', grepRenderer(ctx.toolViews)), transcript.tool('glob', globRenderer(ctx.toolViews))]
      return () => added.forEach(dispose => void dispose())
    })
  },
})
