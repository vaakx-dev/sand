import { hostChannel } from '@sand/host-runtimes/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { locationAnswer, locationDeviceName } from '../contract'
import { Asks, type Located } from './ask'
import { group, locationTool } from './tool'

export default definePlugin({
  name: 'location',
  description: "Gives agents the user's current location, asking every open phone and browser and preferring a phone's answer",
  inject: { tools, server },
  config: z.object({
    wait_ms: z.number().int().positive().default(15_000),
    phone_grace_ms: z.number().int().nonnegative().default(1_500),
  }),
  apply(ctx, config) {
    const asks = new Asks({ waitMs: config.wait_ms, phoneGraceMs: config.phone_grace_ms }, ctx.server)

    const nameOf = (device: string) =>
      ctx
        .get(hostChannel)
        ?.call(locationDeviceName, { device })
        .catch(() => undefined)

    const named = async (located: Located) => ({ ...located, name: await nameOf(located.device) })

    const locate = async (signal: AbortSignal) => {
      const located = await asks.locate(signal)
      return located && named(located)
    }

    ctx.effect(() => () => asks.stop())
    ctx.effect(() => ctx.server.handle(locationAnswer, ({ id, fix }, caller) => asks.answer(id, fix, caller)))
    ctx.effect(() => ctx.tools.group(group))
    ctx.effect(() => ctx.tools.register(locationTool(locate, config.wait_ms)))
  },
})
