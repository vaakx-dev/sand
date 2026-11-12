import { threadsChange, type Threads } from '@sand/web-client/contract'
import { onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const longestTimer = 2 ** 31 - 1
const grace = 500

export const wakeTimer = (ctx: Context, threads: Threads, update: () => void) => {
  let stop: (() => void) | undefined

  const schedule = () => {
    stop?.()
    stop = undefined
    const now = Date.now()
    const next = Math.min(...threads.list().map(thread => thread.info.snoozed ?? Infinity).filter(at => at > now))
    if (!Number.isFinite(next)) return
    stop = onTimeout(() => {
      update()
      schedule()
    }, Math.min(next - now + grace, longestTimer))
  }

  schedule()
  ctx.on(threadsChange, schedule)
  ctx.effect(() => () => stop?.())
}
