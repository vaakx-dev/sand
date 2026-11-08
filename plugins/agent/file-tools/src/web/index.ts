import { toolViews as toolViewsService, transcript as transcriptService } from '@sand/transcript/contract'
import { kit as kitService } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { editRenderer } from './diff'

export default definePlugin({
  name: 'file-tool-views',
  description: 'Shows edit calls as a diff',
  inject: { toolViews: toolViewsService, kit: kitService },
  apply(ctx) {
    ctx.watch(transcriptService, transcript => transcript?.tool('edit', editRenderer(ctx.kit, ctx.toolViews)))
  },
})
