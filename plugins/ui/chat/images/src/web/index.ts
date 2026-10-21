import { definePlugin } from 'drydock'
import { imageViewer, replyImages } from '../contract'
import { inject } from './context'
import { createReplyImages } from './replies/images'
import { createImageViewer } from './viewer'

export default definePlugin({
  name: 'images-view',
  description: "Opens the chat's images full screen, and shows the image files a reply links to inside the reply",
  inject,
  apply(ctx) {
    ctx.provide(imageViewer, createImageViewer(ctx))
    ctx.provide(replyImages, createReplyImages(ctx.wire, ctx.threads))
  },
})
