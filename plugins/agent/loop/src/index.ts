import { definePlugin } from 'drydock'
import { inject } from './context'
import { loop } from './contract'
import { createFrame } from './frame/run'

export default definePlugin({
  name: 'loop',
  description: 'The agent loop: sends the conversation to the model, runs the tools it calls and repeats until it is done',
  inject,
  apply(ctx) {
    ctx.provide(loop, createFrame(ctx))
  },
})
