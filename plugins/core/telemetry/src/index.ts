import { definePlugin } from 'drydock'
import { z } from 'zod'
import { commonProperties, createCapture } from './capture'
import { watchHost } from './events/host'
import { watchPcs } from './events/pcs'
import { watchTurns } from './events/turns'
import { installId, personId } from './identity'
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
    const home = ctx.cli.home
    const [install, common] = await Promise.all([installId(home), commonProperties()])
    const queue = createQueue(async events => sendBatch(config, await personId(home, install), events))
    const capture = createCapture(queue.add, { ...common, install })
    ctx.effect(() => {
      const timer = setInterval(queue.tick, flushEvery)
      return () => {
        clearInterval(timer)
        void queue.flush()
      }
    })
    if (ctx.cli.mode !== 'host') return watchTurns(ctx, capture)
    watchHost(ctx, capture)
    watchPcs(ctx, capture, home, install)
  },
})
