import { composer } from '@sand/composer/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { threadTrigger } from './trigger'

export default definePlugin({
  name: 'thread-refs',
  description: 'Lists your other threads after @ in the composer and links the one you pick as a thread chip',
  inject: { threads },
  apply(ctx) {
    ctx.watch(composer, found => found?.trigger(threadTrigger(ctx.threads), 10))
  },
})
