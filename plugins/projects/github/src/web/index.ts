import { definePlugin } from 'drydock'
import { createPulls } from './pulls'

export default definePlugin({
  name: 'github-pulls',
  description: 'Looks up the pull request of thread branches for the page',
  inject: ['wire'],
  apply(ctx) {
    ctx.provide('pulls', createPulls(ctx))
  },
})
