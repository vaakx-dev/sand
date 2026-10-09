import { definePlugin } from 'drydock'
import { shellRenderer } from './render'

export default definePlugin({
  name: 'view-shell',
  description: 'Shows shell calls as a command with its output and exit code',
  inject: ['toolViews'],
  uses: { transcript: 'does nothing: shell calls use the generic view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.tool('shell', shellRenderer(ctx.toolViews)))
  },
})
