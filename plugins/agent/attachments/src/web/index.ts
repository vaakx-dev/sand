import { wire, wireHello } from '@sand/devices-contract'
import { owned, pulse } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { helloAttachments } from '../contract'
import { inject } from './context'
import { shelves } from './contract'
import { refuseStrayDrops } from './drop'
import { createShelf } from './shelf'

export default definePlugin({
  name: 'attachment-shelves',
  description: 'Files attached to a message before it is sent: picking, pasting and dropping them, the shelf that shows them, and their upload',
  inject,
  apply(ctx) {
    const attachable = pulse(ctx, [wireHello], [wire]).read(() => Boolean(ctx.wire.hello(helloAttachments)))
    owned(ctx, refuseStrayDrops)
    ctx.provide(shelves, { create: (items, place) => createShelf(ctx, attachable, items, place) })
  },
})
