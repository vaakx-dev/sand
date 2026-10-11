import { floating } from '@sand/dom'
import { definePlugin } from 'drydock'
import { replyBubble } from './bubble'

export default definePlugin({
  name: 'quote-reply',
  description: 'Select text in a message and press Reply to quote it in your next message',
  inject: ['composer'],
  apply(ctx) {
    floating(ctx, () => replyBubble(text => ctx.composer.quote(text)))
  },
})
