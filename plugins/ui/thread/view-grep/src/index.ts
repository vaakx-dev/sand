import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { globRenderer, grepRenderer } from './render'

export default definePlugin({
  name: 'view-grep',
  description: 'Shows grep matches grouped by file, and glob results as a file list',
  inject: ['toolViews', 'kit'],
  uses: { transcript: 'does nothing: searches use the generic view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && joinDisposers(transcript.tool('grep', grepRenderer(ctx.kit, ctx.toolViews)), transcript.tool('glob', globRenderer(ctx.kit, ctx.toolViews))))
  },
})
