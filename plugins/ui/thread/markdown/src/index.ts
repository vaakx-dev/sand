import { definePlugin } from 'drydock'
import { highlight } from './code/highlight'
import { markdownInline, markdownNodes } from './render'
import { settleMarkdown } from './settle'

export default definePlugin({
  name: 'markdown',
  description: 'Turns markdown and code into styled elements for the thread',
  inject: ['kit'],
  uses: { math: 'formulas show as written' },
  apply(ctx) {
    ctx.watch('math', math => {
      const renderers = { kit: ctx.kit, math }
      return ctx.provide('markdown', { nodes: markdownNodes(renderers), settle: settleMarkdown(renderers), inline: markdownInline(renderers), highlight })
    })
  },
})
