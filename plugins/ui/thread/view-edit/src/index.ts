import { definePlugin } from 'drydock'
import { editRenderer, writeRenderer } from './render'

export default definePlugin({
  name: 'view-edit',
  description: 'Shows edit and write calls as small diffs with added and removed line counts',
  inject: ['toolViews'],
  uses: { transcript: 'does nothing: edits use the generic view', commands: 'no "Open in changes" button' },
  apply(ctx) {
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const commands = () => ctx.commands
      const added = [transcript.tool('edit', editRenderer(commands, ctx.toolViews)), transcript.tool('write', writeRenderer(commands, ctx.toolViews))]
      return () => added.forEach(dispose => void dispose())
    })
  },
})
