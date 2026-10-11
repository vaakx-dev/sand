import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { browserRenderer, looks } from './renderers'

export default definePlugin({
  name: 'browser-tools-view',
  description: 'Shows browser_* calls as the pages, clicks, typing and screenshots the browser agent saw',
  inject: ['toolViews'],
  uses: { transcript: 'browser calls use the generic tool view' },
  apply(ctx) {
    ctx.watch('transcript', transcript =>
      transcript ? joinDisposers(...Object.entries(looks).map(([name, look]) => transcript.tool(name, browserRenderer(look, ctx.toolViews)))) : undefined,
    )
  },
})
