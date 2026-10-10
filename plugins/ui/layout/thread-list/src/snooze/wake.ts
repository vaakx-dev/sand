import { onTimeout } from '@sand/dom'
import type { Context } from 'drydock'

const longestTimer = 2 ** 31 - 1
const grace = 500

export const wakeTimer = (ctx: Context<'threads'>, update: () => void) => {
  let stop: (() => void) | undefined

  const schedule = () => {
    stop?.()
    stop = undefined
    const now = Date.now()
    const next = Math.min(...ctx.threads.list().map(thread => thread.info.snoozed ?? Infinity).filter(at => at > now))
    if (!Number.isFinite(next)) return
    stop = onTimeout(() => {
      update()
      schedule()
    }, Math.min(next - now + grace, longestTimer))
  }

  const seeBack = (id: string | undefined) => {
    const thread = id ? ctx.threads.get(id) : undefined
    if (thread?.info.snoozed && thread.info.snoozed <= Date.now()) void ctx.threads.snooze(thread.id, null).catch(() => {})
  }

  schedule()
  const disposers = [ctx.on('threads.change', schedule), ctx.on('thread.select', seeBack)]
  return () => {
    stop?.()
    disposers.forEach(dispose => void dispose())
  }
}
