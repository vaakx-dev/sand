import { sessions } from '@sand/chats/contract'
import { promptContent } from '@sand/chats/prompt'
import { loop, sessionOpened, turnEnd, turnInbox, turnPrompt } from '@sand/loop/contract'
import { definePlugin } from 'drydock'
import { steering as steeringService, turnQueue, turnSteer, turnUnsteer, type Steering } from './contract'
import { createQueues } from './queue'
import { queueState, serveSteering } from './serve'

export default definePlugin({
  name: 'steering',
  description: 'Steers sent while a turn runs; the loop picks them up at its next step',
  inject: { loop, sessions },
  apply(ctx) {
    const queues = createQueues(session => ctx.emit(turnQueue, session))

    const steering: Steering = {
      steer: (session, prompt, label) => (ctx.loop.active(session) ? queues.add(session, prompt, label) : undefined),
      unsteer(session, id) {
        const removed = queues.remove(session, id)
        if (removed) ctx.emit(turnUnsteer, session, id)
        return removed
      },
      list: queues.list,
    }

    ctx.on(turnInbox, async (content, session) => {
      const taken = queues.take(session)
      if (!taken.length) return content
      const drained = [...content]
      for (const steer of taken) {
        const expanded = await ctx.waterfall(turnPrompt, promptContent(steer.prompt), session)
        ctx.emit(turnSteer, session, expanded, steer.id)
        drained.push(...expanded)
      }
      return drained
    })
    ctx.on(turnEnd, session => void queues.take(session))
    ctx.on(sessionOpened, (opened, session) => ({ ...opened, queue: queueState(steering, session) }))
    ctx.provide(steeringService, steering)
    serveSteering(ctx, steering)
  },
})
