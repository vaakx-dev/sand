import { pcHello, type Wire } from '@sand/devices-contract'
import { runtimeFailed } from '@sand/host-runtimes/contract'
import type { Context } from 'drydock'

export const reloadFinished = (ctx: Context, wire: Wire, pc: string | undefined) =>
  new Promise<void>(resolve => {
    const ours = (from: string) => pc === undefined || from === pc
    const stops = [
      wire.on(
        runtimeFailed,
        (_, from) => {
          if (ours(from)) done()
        },
        { from: 'all' },
      ),
      ctx.on(pcHello, from => {
        if (ours(from)) done()
      }),
    ]
    const done = () => {
      for (const stop of stops) void stop()
      resolve()
    }
  })
