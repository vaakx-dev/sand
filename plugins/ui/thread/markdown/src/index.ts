import { definePlugin } from 'drydock'
import { highlight } from './code/highlight'
import { useMath } from './math/renderer'
import { markdownInline, markdownNodes } from './render'
import { settleMarkdown } from './settle'

export default definePlugin({
  name: 'markdown',
  description: 'Turns markdown and code into styled elements for the thread',
  uses: { math: 'formulas show as written' },
  apply(ctx) {
    ctx.watch('math', useMath)
    ctx.provide('markdown', { nodes: markdownNodes, settle: settleMarkdown, inline: markdownInline, highlight })
  },
})
