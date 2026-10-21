import { sessions } from '@sand/chats/contract'
import { loop, turnEnd, turnStart } from '@sand/loop/contract'
import type { Context } from 'drydock'
import type { RuntimeActivity } from '../contract'

export const createActivity = (ctx: Context, changed: (activity: RuntimeActivity) => void) => {
  const turns = new Set<string>()
  const settling = new Set<string>()
  let timer: Timer | undefined

  const accepted = (id: string) => {
    const session = ctx.get(sessions)?.open(id)
    return Boolean(session && ctx.get(loop)?.active(session))
  }

  const activity = (): RuntimeActivity => {
    for (const id of settling) if (turns.has(id) || !accepted(id)) settling.delete(id)
    return { sessions: [...new Set([...turns, ...settling])] }
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
    turns.add(session.id)
    schedule()
  })
  ctx.on(turnEnd, session => {
    turns.delete(session.id)
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
