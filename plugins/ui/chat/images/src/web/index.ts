import { definePlugin } from 'drydock'
import { imageViewer } from '../contract'
import { inject } from './context'
import { createImageViewer } from './viewer'

export default definePlugin({
  name: 'images-view',
  description: "Opens the chat's images full screen, with every image in the chat in a strip to flip through",
  inject,
  apply(ctx) {
    ctx.provide(imageViewer, createImageViewer(ctx))
  },
})
