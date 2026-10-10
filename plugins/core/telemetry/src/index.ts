import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { commonProperties, createCapture } from './capture'
import { watchHost } from './events/host'
import { watchTurns } from './events/turns'
import { installId } from './identity'
import { sendBatch } from './send/posthog'
import { createQueue } from './send/queue'

const flushEvery = 5_000

export default definePlugin({
  name: 'telemetry',
  description: 'Sends anonymous usage events to PostHog; turn it off with enabled = false under [plugins.telemetry]',
  inject: ['cli'],
  config: z.object({
    key: z.string().default('phc_D57zo6N5vU2u8wu8gp3t6Qu5WYUDEc8S4DHSVi5wPpAA'),
    url: z.string().default('https://us.i.posthog.com'),
  }),
  async apply(ctx, config) {
    if (ctx.cli.safe) return
    const [id, common] = await Promise.all([installId(join(ctx.cli.home, 'telemetry-id')), commonProperties()])
    const queue = createQueue(events => sendBatch(config, id, events))
    const capture = createCapture(queue.add, common)
    ctx.effect(() => {
      const timer = setInterval(queue.tick, flushEvery)
      return () => {
        clearInterval(timer)
        void queue.flush()
      }
    })
    if (ctx.cli.mode === 'host') watchHost(ctx, capture)
    else watchTurns(ctx, capture)
  },
})
