import { style } from '@sand/dom'
import { definePlugin } from 'drydock'
import { highlight } from './code/highlight'
import { markdownInline, markdownNodes } from './render'
import { markdownCss } from './style'

export default definePlugin({
  name: 'markdown',
  description: 'Turns markdown and code into styled elements for the thread',
  apply(ctx) {
    style(ctx, markdownCss)
    ctx.provide('markdown', { nodes: markdownNodes, inline: markdownInline, highlight })
  },
})
