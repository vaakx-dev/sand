import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { fetchRenderer, searchRenderer } from './renderers'

export default definePlugin({
  name: 'web-search-view',
  description: 'Shows web_search calls as a list of linked results, and web_fetch calls as the page text the agent read',
  inject: ['toolViews'],
  uses: { transcript: 'web calls use the generic tool view' },
  apply(ctx) {
    ctx.watch('transcript', transcript =>
      transcript ? joinDisposers(transcript.tool('web_search', searchRenderer(ctx.toolViews)), transcript.tool('web_fetch', fetchRenderer(ctx.toolViews))) : undefined,
    )
  },
})
