import { toolViews as toolViewsService, transcript as transcriptService } from '@sand/chat/contract'
import { markdown as markdownService } from '@sand/markdown/contract'
import { kit as kitService } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { globRenderer, grepRenderer } from './grep/render'
import { readRenderer } from './read/render'
import { shellRenderer } from './shell/render'

export default definePlugin({
  name: 'tool-views',
  description: 'Shows read calls as highlighted code, grep and glob results grouped by file, and shell calls with their output',
  inject: { toolViews: toolViewsService, kit: kitService },
  apply(ctx) {
    const { kit, toolViews } = ctx
    ctx.watch(markdownService, markdown =>
      ctx.watch(
        transcriptService,
        transcript =>
          transcript &&
          joinDisposers(
            transcript.tool('read', readRenderer(kit, toolViews, markdown?.highlight)),
            transcript.tool('grep', grepRenderer(kit, toolViews)),
            transcript.tool('glob', globRenderer(kit, toolViews)),
            transcript.tool('shell', shellRenderer(kit, toolViews)),
            transcript.tool('powershell', shellRenderer(kit, toolViews)),
          ),
      ),
    )
  },
})
