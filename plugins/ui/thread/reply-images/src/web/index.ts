import { definePlugin } from 'drydock'
import { replyImages } from './images'

export default definePlugin({
  name: 'reply-images-view',
  description: 'Shows the image files a reply links to with markdown, inside the reply',
  inject: ['wire', 'threads'],
  apply(ctx) {
    ctx.provide('replyImages', replyImages(ctx.wire, ctx.threads))
  },
})
