import { definePlugin } from 'drydock'
import { readRenderer } from './render'

export default definePlugin({
  name: 'view-read',
  description: 'Shows read calls as highlighted code with line numbers',
  inject: ['toolViews', 'kit'],
  uses: { transcript: 'does nothing: reads use the generic view', markdown: 'code is shown without highlighting' },
  apply(ctx) {
    ctx.watch('markdown', markdown => ctx.watch('transcript', transcript => transcript?.tool('read', readRenderer(ctx.kit, ctx.toolViews, markdown?.highlight))))
  },
})
