import { definePlugin } from 'drydock'
import type { Steering } from './contract'
import { createQueues } from './queue'
import { queueState, serveSteering } from './serve'

export default definePlugin({
  name: 'steering',
  description: 'Steers sent while a turn runs; the loop picks them up at its next step',
  inject: ['loop', 'sessions'],
  apply(ctx) {
    const queues = createQueues(session => ctx.emit('turn.queue', session))

    const steering: Steering = {
      steer: (session, prompt, label) => (ctx.loop.active(session) ? queues.add(session, prompt, label) : undefined),
      unsteer: (session, id) => queues.remove(session, id),
      list: queues.list,
    }

    ctx.on('turn.inbox', async (content, session) => {
      const taken = queues.take(session)
      if (!taken.length) return content
      const drained = [...content]
      for (const steer of taken) {
        const expanded = await ctx.waterfall('turn.prompt', steer.prompt, session)
        ctx.emit('turn.steer', session, expanded, steer.id)
        drained.push(...expanded)
      }
      return drained
    })
    ctx.on('turn.end', session => void queues.take(session))
    ctx.on('session.opened', (opened, session) => ({ ...opened, queue: queueState(ctx, steering, session) }))
    ctx.provide('steering', steering)
    serveSteering(ctx, steering)
  },
})
