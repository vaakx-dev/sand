import { definePlugin } from 'drydock'
import { globRenderer, grepRenderer } from './render'

export default definePlugin({
  name: 'view-grep',
  description: 'Shows grep matches grouped by file, and glob results as a file list',
  uses: { transcript: 'does nothing: searches use the generic view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const added = [transcript.tool('grep', grepRenderer), transcript.tool('glob', globRenderer)]
      return () => added.forEach(dispose => void dispose())
    })
  },
})
