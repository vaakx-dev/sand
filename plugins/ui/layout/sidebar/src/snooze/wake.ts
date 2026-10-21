import { threadSelect, threadsChange, type Threads } from '@sand/web-client/contract'
import { onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { isBack } from './actions'

const longestTimer = 2 ** 31 - 1
const grace = 500

export const wakeTimer = (ctx: Context, threads: () => Threads | undefined, update: () => void) => {
  let stop: (() => void) | undefined

  const schedule = () => {
    stop?.()
    stop = undefined
    const now = Date.now()
    const next = Math.min(...(threads()?.list() ?? []).map(thread => thread.info.snoozed ?? Infinity).filter(at => at > now))
    if (!Number.isFinite(next)) return
    stop = onTimeout(() => {
      update()
      schedule()
    }, Math.min(next - now + grace, longestTimer))
  }

  const seeBack = (id: string | undefined) => {
    const thread = id ? threads()?.get(id) : undefined
    if (thread && isBack(thread)) void threads()?.snooze(thread.id, null).catch(() => {})
  }

  schedule()
  ctx.on(threadsChange, schedule)
  ctx.on(threadSelect, seeBack)
  ctx.effect(() => () => stop?.())
}
