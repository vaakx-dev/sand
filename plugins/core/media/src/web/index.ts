import { kit } from '@sand/ui-kit/contract'
import { threads, wire } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { mediaView } from './contract'
import { createImages } from './image'
import { createSigner } from './sign'

export default definePlugin({
  name: 'media-view',
  description: "Shows the chat's images from the PC that holds them, through signed links the browser loads and caches",
  inject: { wire, threads, kit },
  apply(ctx) {
    ctx.provide(mediaView, createImages(ctx.kit, createSigner(ctx.wire, ctx.threads)))
  },
})
