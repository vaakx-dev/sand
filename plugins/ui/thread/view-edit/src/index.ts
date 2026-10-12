import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { editRenderer, writeRenderer } from './render'

export default definePlugin({
  name: 'view-edit',
  description: 'Shows edit and write calls as small diffs with added and removed line counts',
  inject: ['toolViews'],
  uses: { transcript: 'does nothing: edits use the generic view', commands: 'no "Open in Edits" button' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && joinDisposers(transcript.tool('edit', editRenderer(ctx)), transcript.tool('write', writeRenderer(ctx))))
  },
})
