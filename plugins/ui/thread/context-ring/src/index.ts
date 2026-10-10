import { pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { contextRing } from './ring'

export default definePlugin({
  name: 'context-ring',
  description: 'A ring next to send that shows how full the context window is, with Compact now',
  inject: ['composer', 'threads'],
  uses: {
    commands: 'Compact now goes straight to the server',
    notify: 'a failed compact is not reported',
  },
  apply(ctx) {
    const changes = pulse(ctx, ['thread.select'])
    ctx.on('thread.change', id => {
      if (id === ctx.threads.current()?.id) changes.bump()
    })
    const usage = changes.read(() => ctx.threads.current()?.context)
    ctx.effect(() => ctx.composer.slot('end', () => contextRing(ctx, usage), 10))
  },
})
