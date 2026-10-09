import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

export const safeSource = (ctx: Context<'wire'>) => {
  const safe = sig(Boolean(ctx.wire.hello()?.safe))
  const busy = sig(false)

  ctx.on('wire.hello', hello => safe.set(Boolean(hello.safe)))

  const leave = async () => {
    if (busy.get()) return
    busy.set(true)
    try {
      const ok = await ctx.wire.call<boolean>({ type: 'runtimes.safe', on: false })
      if (!ok) ctx.notify?.push('sand could not leave safe mode; your plugins may still be failing', { level: 'error' })
    } catch (error) {
      ctx.notify?.push(errorMessage(error), { level: 'error' })
    } finally {
      busy.set(false)
    }
  }

  return { safe, busy, leave }
}

export type SafeSource = ReturnType<typeof safeSource>
