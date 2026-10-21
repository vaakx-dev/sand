import { runtimeFailed } from '@sand/host-runtimes/contract'
import { type Wire, wireHello } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const reloadFinished = (ctx: Context, wire: Wire) =>
  new Promise<void>(resolve => {
    const stops = [wire.on(runtimeFailed, () => done()), ctx.on(wireHello, () => done())]
    const done = () => {
      for (const stop of stops) void stop()
      resolve()
    }
  })
