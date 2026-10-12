import { floating } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { replyBubble } from './bubble'

export default definePlugin({
  name: 'quote-reply',
  description: 'Select text in a message and press Reply to quote it in your next message',
  inject: ['composer', 'kit'],
  apply(ctx) {
    floating(ctx, () => replyBubble(ctx.kit, text => ctx.composer.quote(text)))
  },
})
