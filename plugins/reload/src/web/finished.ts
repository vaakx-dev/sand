import type { Context } from 'drydock'

export const reloadFinished = (ctx: Context) =>
  new Promise<void>(resolve => {
    const stops = [
      ctx.on('wire.event', event => {
        if (event.name === 'plugins.reloaded') done()
      }),
      ctx.on('wire.hello', () => done()),
    ]
    const done = () => {
      for (const stop of stops) void stop()
      resolve()
    }
  })
