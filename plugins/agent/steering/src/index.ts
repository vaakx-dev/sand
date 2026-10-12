import { sentContent } from '@sand/kit'
import type { SenderEntries } from '@sand/sessions-sqlite/contract'
import { definePlugin } from 'drydock'
import type { Steering } from './contract'
import { createQueues } from './queue'
import { queueState, serveSteering } from './serve'

export default definePlugin({
  name: 'steering',
  description: 'Steers sent while a turn runs; the loop picks them up at its next step',
  inject: ['loop', 'sessions'],
  uses: {
    server: 'the page cannot steer a running turn',
    followUps: 'queued follow-ups are not shown with steers',
  },
  apply(ctx) {
    const queues = createQueues(session => ctx.emit('turn.queue', session))

    const steering: Steering = {
      steer: (session, prompt, label, from) => (ctx.loop.active(session) ? queues.add(session, prompt, label, from) : undefined),
      unsteer(session, id) {
        const removed = queues.remove(session, id)
        if (removed) ctx.emit('turn.unsteer', session, id)
        return removed
      },
      list: queues.list,
    }

    ctx.on('turn.inbox', async (content, session) => {
      const taken = queues.take(session)
      if (!taken.length) return content
      const drained = [...content]
      for (const steer of taken) {
        if (steer.from) session.append('sent-by', steer.from satisfies SenderEntries['sent-by'])
        const expanded = await ctx.waterfall('turn.prompt', sentContent(steer.prompt, steer.from), session)
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
