import { runtimesSafe } from '@sand/host-runtimes/contract'
import { helloSafe } from '@sand/server/contract'
import { wireHello, type wire } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const safeSource = (ctx: Context<{ wire: typeof wire }>) => {
  const safe = sig(Boolean(ctx.wire.hello(helloSafe)))
  const busy = sig(false)

  ctx.on(wireHello, () => safe.set(Boolean(ctx.wire.hello(helloSafe))))

  const leave = async () => {
    if (busy.get()) return
    busy.set(true)
    await ctx.wire.call(runtimesSafe, { on: false }).catch(() => {})
    busy.set(false)
  }

  return { safe, busy, leave }
}

export type SafeSource = ReturnType<typeof safeSource>
