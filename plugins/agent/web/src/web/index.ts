import { toolViews, transcript } from '@sand/transcript/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { fetchView, searchView } from './views'

export default definePlugin({
  name: 'web-views',
  description: 'Shows web_search calls as a list of linked results and web_fetch calls with the page title',
  apply(ctx) {
    ctx.watch(toolViews, views =>
      views ? ctx.watch(transcript, found => found && joinDisposers(found.tool('web_search', searchView(views)), found.tool('web_fetch', fetchView(views)))) : undefined,
    )
  },
})
