import type { Session } from '@sand/sessions-sqlite/contract'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

interface Pending {
  session: Session
  text: string
}

export const createDelivery = (ctx: Context<'loop'>) => {
  const pending = new Map<string, Pending>()
  const timers = new Set<Timer>()

  const deliver = (session: Session, text: string) => {
    const steered = ctx.steering?.steer(session, text)
    if (steered) return void pending.set(steered, { session, text })
    ctx.loop.run(session, text).catch(error => ctx.ui?.notify(`Could not deliver a background result: ${errorMessage(error)}`, 'error'))
  }

  const later = (session: Session, text: string) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      deliver(session, text)
    })
    timers.add(timer)
  }

  ctx.on('turn.steer', (_session, _content, id) => {
    pending.delete(id)
  })

  ctx.on('turn.unsteer', (_session, id) => {
    pending.delete(id)
  })

  ctx.on('turn.end', session => {
    for (const [id, item] of pending) {
      if (item.session.id !== session.id) continue
      pending.delete(id)
      later(item.session, item.text)
    }
  })

  ctx.effect(() => () => {
    timers.forEach(clearTimeout)
    timers.clear()
    pending.clear()
  })

  return deliver
}
