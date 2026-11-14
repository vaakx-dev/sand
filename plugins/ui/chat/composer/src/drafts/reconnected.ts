import { wireHello } from '@sand/devices-contract'
import { onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const RETRY_MS = 5_000

export const reconnected = (ctx: Context) =>
  new Promise<void>(resolve => {
    const done = () => {
      stopTimer()
      stop()
      resolve()
    }
    const stopTimer = onTimeout(done, RETRY_MS)
    const stop = ctx.on(wireHello, done)
  })
