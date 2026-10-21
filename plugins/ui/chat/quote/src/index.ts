import { composer } from '@sand/composer/contract'
import { floating } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { replyBubble } from './bubble'

export default definePlugin({
  name: 'quote',
  description: 'Select text in a message and press Reply to quote it in your next message',
  inject: { composer, kit },
  apply(ctx) {
    floating(ctx, () => replyBubble(ctx.kit, text => ctx.composer.quote(text)))
  },
})
