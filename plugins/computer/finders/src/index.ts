import { llm } from '@sand/accounts/contract'
import { media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { finders } from './contract'
import { createFinders } from './make'

export default definePlugin({
  name: 'finders',
  description: 'Finds where to click on a screenshot with any vision model, or a model picking from an element list, and strategies that zoom, grid or mark the screen',
  inject: { llm, media },
  apply(ctx) {
    ctx.provide(finders, createFinders({ llm: ctx.llm, media: ctx.media }))
  },
})
