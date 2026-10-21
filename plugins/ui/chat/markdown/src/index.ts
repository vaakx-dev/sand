import { math as mathService } from '@sand/math/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { highlight } from './code/highlight'
import { markdown } from './contract'
import { markdownInline, markdownNodes } from './render'
import { settleMarkdown } from './settle'

export default definePlugin({
  name: 'markdown',
  description: 'Turns markdown and code into styled elements for the chat',
  inject: { kit },
  apply(ctx) {
    ctx.watch(mathService, math => {
      const renderers = { kit: ctx.kit, math }
      return ctx.provide(markdown, { nodes: markdownNodes(renderers), settle: settleMarkdown(renderers), inline: markdownInline(renderers), highlight })
    })
  },
})
