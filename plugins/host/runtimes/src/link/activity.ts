import { sessions } from '@sand/chats/contract'
import { turnChange, turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'
import type { RuntimeActivity } from '../contract'

export const createActivity = (ctx: Context, changed: (activity: RuntimeActivity) => void) => {
  const touched = new Set<string>()
  let timer: Timer | undefined

  const running = (id: string) => {
    const session = ctx.get(sessions)?.open(id)
    return Boolean(session && ctx.get(turns)?.current(session))
  }

  const activity = (): RuntimeActivity => {
    for (const id of touched) if (!running(id)) touched.delete(id)
    return { sessions: [...touched] }
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    changed(activity())
  }

  ctx.on(turnChange, info => {
    touched.add(info.session)
    timer ??= setTimeout(flush, 0)
  })
  ctx.effect(() => () => clearTimeout(timer))

  return {
    activity,
    flush,
    pending: () => timer !== undefined,
    idle: () => !activity().sessions.length,
  }
}
