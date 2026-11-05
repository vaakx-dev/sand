import { sessions } from '@sand/chats/contract'
import { turnEnd, turnStart, turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'
import type { RuntimeActivity } from '../contract'

export const createActivity = (ctx: Context, changed: (activity: RuntimeActivity) => void) => {
  const running = new Set<string>()
  const settling = new Set<string>()
  let timer: Timer | undefined

  const accepted = (id: string) => {
    const session = ctx.get(sessions)?.open(id)
    return Boolean(session && ctx.get(turns)?.current(session))
  }

  const activity = (): RuntimeActivity => {
    for (const id of settling) if (running.has(id) || !accepted(id)) settling.delete(id)
    return { sessions: [...new Set([...running, ...settling])] }
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    changed(activity())
  }

  const schedule = () => {
    timer ??= setTimeout(flush, 0)
  }

  ctx.on(turnStart, session => {
    running.add(session.id)
    schedule()
  })
  ctx.on(turnEnd, session => {
    running.delete(session.id)
    settling.add(session.id)
    schedule()
  })
  ctx.effect(() => () => clearTimeout(timer))

  return {
    activity,
    flush,
    pending: () => timer !== undefined,
    idle: () => !activity().sessions.length,
  }
}
