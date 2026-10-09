import { definePlugin } from 'drydock'
import { readRenderer } from './render'

export default definePlugin({
  name: 'view-read',
  description: 'Shows read calls as highlighted code with line numbers',
  uses: { transcript: 'does nothing: reads use the generic view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.tool('read', readRenderer))
  },
})
